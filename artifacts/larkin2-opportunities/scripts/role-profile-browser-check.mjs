import assert from "node:assert/strict";
import { chromium } from "playwright";
import { PRODUCTION_CULTURE, PRODUCTION_COMMITMENTS } from "../../../lib/api-client-react/src/role-profile.ts";

// Browser interactions use an in-memory API. Real persistence is verified separately
// by the explicit development-only API test; this check never changes live records.
const origin = process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:80";
const id = "00000000-0000-4000-8000-000000000231";
const timestamp = "2026-10-11T12:00:00Z";
const browser = await chromium.launch({ headless: true, executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
const emptyProfile = {
  id, slug: "profile-browser-check", title: "Profile browser check", publicationLabel: "Roles",
  department: "CAMERA", roleType: "full time", summary: "Support the team with this representative role purpose.",
  applicationDeadline: "Applications close 1 December", applicationUrl: "https://example.com/apply",
  responseDate: "Shortlisted applicants contacted by 8 December", deadline: null,
  status: "draft", deadlineExtended: false, featured: false, urgent: false,
  createdAt: timestamp, updatedAt: timestamp, createdBy: "test", updatedBy: "test",
  contentItems: [{ id: `${id}-content`, section: "responsibility", position: 0, content: "Retained legacy responsibility" }],
  details: [
    { id: `${id}-location`, position: 0, label: "Location", value: "Legacy London" },
    { id: `${id}-custom`, position: 1, label: "Custom detail", value: "Keep this text" },
  ],
};
try {
  for (const width of [1280, 1024, 820, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let record = structuredClone(emptyProfile);
    let saves = 0;
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/portal/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let body;
      if (path.endsWith("/session")) body = {
        member: { id: "test", userId: "test", displayName: "Test staff", email: "staff@example.com", role: "super_admin", active: true, status: "active", createdAt: timestamp, updatedAt: timestamp },
        permissions: ["opportunities:read", "opportunities:write", "opportunities:publish", "opportunities:delete", "opportunity-options:manage"],
      };
      else if (path.endsWith("/opportunity-options")) body = { departments: [{ id, label: "CAMERA", active: true }], roleTypes: [{ id, label: "full time", active: true }] };
      else if (path.endsWith(`/opportunities/${id}`)) {
        if (route.request().method() === "PATCH") {
          record = { ...record, ...route.request().postDataJSON() };
          saves++;
        }
        body = record;
      } else if (path.endsWith("/audit")) body = [];
      else if (path.includes("/matching")) body = { contentType: "role", crafts: [], tags: [], careerLevels: [] };
      else if (path.endsWith("/opportunities")) {
        if (route.request().method() === "POST") {
          record = { ...emptyProfile, ...route.request().postDataJSON() };
          saves++;
          body = record;
        } else body = { items: [record], page: 1, pageSize: 20, total: 1, pageCount: 1 };
      }
      else body = {};
      await route.fulfill({ status: 200, json: body });
    });
    const edit = `${origin}/larkin2-opportunities-portal/roles/${id}/edit`;
    const tab = name => page.getByTestId(`tab-${name}`).click();
    const fill = (name, value) => page.getByTestId(`input-${name}`).fill(value);
    await page.goto(edit);
    await page.getByTestId("input-title").waitFor();
    for (const name of ["basics", "profile", "content", "details", "apply", "planning"]) {
      await tab(name);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: ${name} overflow`);
    }
    await tab("profile");
    assert.equal(await page.getByTestId("input-location").inputValue(), "Legacy London");
    await fill("location", "Studio London");
    await fill("accountableTo", "Camera Supervisor");
    await fill("contractDatesHours", "10-hour days; hiatus 20–31 December");
    await page.getByTestId("radio-workArrangement-hybrid").click();
    for (let n = 0; n < 5; n++) {
      await page.getByTestId("button-add-worksCloselyWith").click();
      await fill(`worksCloselyWith-${n}`, `Group ${n + 1}`);
    }
    assert.equal(await page.getByTestId("button-add-worksCloselyWith").isDisabled(), true);
    await fill("additionalInformation", "Please include a portfolio link");
    const cultureText = await page.locator("form").first().innerText();
    for (const paragraph of [...PRODUCTION_CULTURE, ...PRODUCTION_COMMITMENTS]) assert.ok(cultureText.includes(paragraph));
    await tab("content");
    assert.equal(await page.getByTestId("input-responsibility-0").inputValue(), "Retained legacy responsibility");
    await page.getByTestId("button-add-essential").click();
    await fill("essential-0", "Knowledge of camera workflows");
    await page.getByTestId("button-add-desired").click();
    await fill("desired-0", "Experience with shared kit");
    await tab("planning");
    await page.getByTestId("radio-recruitmentRoute-production").click();
    await fill("shortlist-size", "4");
    await page.getByTestId("button-save-role").click();
    assert.equal(saves, 0);
    assert.equal(await page.getByTestId("input-shortlist-size").inputValue(), "4");
    await fill("shortlist-size", "8");
    await page.getByTestId("radio-interviewFormat-virtual").click();
    await fill("interviewDates", "unknown");
    for (let n = 0; n < 3; n++) {
      await page.getByTestId("button-add-technicalQuestions").click();
      await fill(`technicalQuestions-${n}`, `Private technical draft ${n + 1}`);
    }
    assert.equal(await page.getByTestId("button-add-technicalQuestions").isDisabled(), true);
    await page.getByTestId("radio-recruitmentRoute-independent").click();
    await page.getByTestId("radio-recruitmentRoute-production").click();
    assert.equal(await page.getByTestId("input-shortlist-size").inputValue(), "8");
    await tab("apply");
    await fill("closing-date", "2026-12-01");
    await fill("closing-time", "17:00");
    await fill("application-email", "agreed@example.com");
    await page.getByTestId("button-save-role").click();
    assert.equal(saves, 0, "Ambiguous email plus legacy URL cannot save");
    await fill("application-url", "");
    await fill("applicationInstructions", "Send your CV");
    await fill("trainingApplicationInstructions", "Accessible formats welcomed");
    await page.getByTestId("button-save-role").click();
    await page.waitForURL(new RegExp(`/roles/${id}$`), { waitUntil: "domcontentloaded" }).catch(async error => {
      console.error("Save failed", width, saves, errors, (await page.locator("body").innerText()).slice(-2200));
      throw error;
    });
    assert.equal(saves, 1);
    assert.equal(record.accountableTo, "Camera Supervisor");
    assert.equal(record.applicationEmail, "agreed@example.com");
    assert.equal(record.applicationUrl, null);
    assert.equal(record.details.filter(row => row.label === "Location").length, 1);
    assert.equal(record.details.find(row => row.label === "Custom detail").value, "Keep this text");
    assert.equal(record.technicalQuestions.length, 3);
    assert.equal(record.worksCloselyWith.length, 5);
    assert.equal(JSON.stringify(record).includes(PRODUCTION_CULTURE[0]), false, "Culture must not be saved as role content");
    await page.goto(edit);
    await tab("planning");
    assert.equal(await page.getByTestId("input-technicalQuestions-0").inputValue(), "Private technical draft 1");
    await page.getByTestId("radio-recruitmentRoute-independent").click();
    await tab("profile");
    assert.equal(await page.getByTestId("input-accountableTo").inputValue(), "Camera Supervisor");
    await fill("accountableTo", "");
    await fill("location", "");
    await page.getByTestId("button-remove-worksCloselyWith-4").click();
    await page.getByTestId("button-save-role").click();
    await page.waitForURL(new RegExp(`/roles/${id}$`));
    assert.equal(record.accountableTo, null);
    assert.equal(record.details.some(row => row.label === "Location"), false);
    assert.equal(record.recruitmentRoute, "independent");
    assert.equal(record.shortlistSize, 8);
    assert.equal(record.technicalQuestions.length, 3);
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(`PASS portal profile editing, clearing, limits, retention and responsive layout at ${width}px`);
    if (width === 1280) {
      await page.goto(`${origin}/larkin2-opportunities-portal/roles/new`);
      await page.getByTestId("input-title").waitFor();
      await fill("title", "New profile creation");
      await fill("slug", "new-profile-creation");
      await fill("summary", "A new role purpose without template example text.");
      await fill("application-deadline", "Applications close 1 December");
      await page.getByRole("combobox").first().click();
      await page.getByRole("option", { name: "CAMERA", exact: true }).click();
      await tab("content");
      assert.equal(await page.getByTestId("input-responsibility-0").count(), 0);
      await tab("details");
      assert.equal(await page.getByTestId("input-detail-label-0").count(), 0);
      await tab("profile");
      await fill("location", "London studio");
      await page.getByTestId("radio-workArrangement-in_person").focus();
      await page.keyboard.press("Space");
      assert.equal(await page.getByTestId("radio-workArrangement-in_person").getAttribute("aria-checked"), "true");
      await page.getByTestId("button-save-role").click();
      await page.waitForURL(new RegExp(`/roles/${id}$`));
      assert.equal(record.title, "New profile creation");
      assert.deepEqual(record.contentItems, []);
      assert.equal(record.details.length, 1);
      assert.equal(record.details[0].label, "Location");
      assert.equal(record.accountableTo, null);
      assert.deepEqual(record.technicalQuestions, []);
      console.log("PASS new role creation with blank optional fields, no seeded examples and keyboard controls");
    }
    await page.close();
  }

  for (const status of ["Open", "Closed", "Filled"]) {
    for (const email of [true, false]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
      const profile = {
        ...emptyProfile, status, responsibilities: ["Support the team"], essential: [], desired: [],
        accountableTo: "Camera Supervisor", contractDatesHours: "Hiatus 20–31 December",
        workArrangement: "hybrid", worksCloselyWith: ["Production"], additionalInformation: "Portfolio requested",
        applicationEmail: email ? "agreed@example.com" : null,
        applicationUrl: email ? null : "https://example.com/apply",
        applicationClosingDate: "2026-12-01", applicationClosingTime: "17:00",
        applicationInstructions: "Send your CV", trainingApplicationInstructions: "Accessible formats welcomed",
      };
      await page.route("**/api/public/opportunities/**", route => route.fulfill({ json: profile }));
      await page.route("**/api/public/engagement", route => route.fulfill({ json: { ok: true } }));
      await page.goto(`${origin}/larkin2-opportunities/roles/${profile.slug}`);
      await page.getByTestId("section-role-culture").waitFor();
      const text = await page.locator("main").innerText();
      for (const paragraph of [...PRODUCTION_CULTURE, ...PRODUCTION_COMMITMENTS]) assert.ok(text.includes(paragraph));
      assert.ok(text.includes("Portfolio requested"));
      assert.ok(text.includes("Accessible formats welcomed"));
      assert.equal(await page.getByTestId("section-role-essential").count(), 0);
      assert.equal(await page.getByTestId("section-role-desired").count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const action = page.getByTestId("link-role-apply-now");
      if (status === "Open") {
        assert.equal(await action.getAttribute("href"), email ? "mailto:agreed@example.com" : "https://example.com/apply");
      } else {
        assert.equal(await action.count(), 0);
        assert.equal(await page.getByTestId("button-role-apply-now-disabled").isDisabled(), true);
        assert.equal(await page.getByTestId("link-role-apply-destination").count(), 0);
      }
      assert.equal(text.includes("Private technical"), false);
      console.log(`PASS public ${status} profile, ${email ? "email" : "platform"} application target, fixed culture and mobile layout`);
      await page.close();
    }
  }
} finally { await browser.close(); }
