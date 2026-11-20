import React, { useEffect, useState } from "react";
import { Building2, LogOut, RefreshCw } from "lucide-react";
import { apiGet, apiPatch, apiPost, apiPut, downloadApiFile } from "../../api.js";
import { ORG_MODULE_ROWS } from "../../org-modules.js";

const TABS = [
  ["overview", "Overview"],
  ["schools", "Schools"],
  ["modules", "Modules"],
  ["people", "People"],
  ["templates", "Templates"],
  ["activity", "Activity"],
];

export default function OperatorDesk({ user, onLogout, refresh, onOpened }) {
  const [tab, setTab] = useState("overview");
  const [orgs, setOrgs] = useState([]);
  const [overview, setOverview] = useState(null);
  const [platformModules, setPlatformModules] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountQuery, setAccountQuery] = useState("");
  const [accountOrg, setAccountOrg] = useState("");
  const [templates, setTemplates] = useState([]);
  const [activity, setActivity] = useState([]);
  const [roles, setRoles] = useState(null);
  const [roleCampus, setRoleCampus] = useState("");
  const [roleId, setRoleId] = useState("");
  const [grants, setGrants] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [activityQuery, setActivityQuery] = useState("");
  const [activityOrg, setActivityOrg] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [godName, setGodName] = useState("");
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [restoreFor, setRestoreFor] = useState(null);

  useEffect(() => {
    document.title = "Organisations · School World";
  }, []);

  async function loadOrgs() {
    const listed = await apiGet("/v1/orgs" + (showArchived ? "?includeArchived=1" : ""));
    const rows = Array.isArray(listed.data) ? listed.data : [];
    const withBranches = await Promise.all(rows.map(async (org) => {
      const branches = await apiGet("/v1/orgs/" + encodeURIComponent(org.id) + "/branches");
      return { ...org, branches: Array.isArray(branches.data) ? branches.data : [] };
    }));
    setOrgs(withBranches);
    const created = Array.isArray(listed.provisionedPrincipals) ? listed.provisionedPrincipals : [];
    if (created.length) {
      setNotice(created.map((row) => row.campusCode + " principal " + row.username + " / " + row.password).join(". "));
    }
    return withBranches;
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [listed, summary, modules] = await Promise.all([
        loadOrgs(),
        apiGet("/v1/platform/overview"),
        apiGet("/v1/platform/modules"),
      ]);
      setOverview(summary);
      setPlatformModules(modules.modules || {});
      if (!roleCampus && listed[0]?.campuses?.[0]) setRoleCampus(listed[0].campuses[0].id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [showArchived]);

  useEffect(() => {
    if (tab !== "people") return;
    const query = accountOrg ? "?orgId=" + encodeURIComponent(accountOrg) : "";
    apiGet("/v1/platform/accounts" + query).then((body) => setAccounts(body.data || [])).catch((err) => setError(err.message));
  }, [tab, accountOrg]);

  useEffect(() => {
    if (tab !== "templates") return;
    apiGet("/v1/platform/templates").then((body) => setTemplates(body.data || [])).catch((err) => setError(err.message));
  }, [tab]);

  useEffect(() => {
    if (tab !== "activity") return;
    const params = new URLSearchParams();
    if (activityOrg) params.set("orgId", activityOrg);
    if (activityQuery.trim()) params.set("q", activityQuery.trim());
    const query = params.toString();
    apiGet("/v1/platform/activity" + (query ? "?" + query : "")).then((body) => setActivity(body.data || [])).catch((err) => setError(err.message));
  }, [tab, activityOrg, activityQuery]);

  useEffect(() => {
    if (tab !== "modules" || !roleCampus) return;
    apiGet("/v1/platform/roles?campusId=" + encodeURIComponent(roleCampus))
      .then((body) => {
        setRoles(body);
        const first = (body.roles || []).find((role) => !role.locked) || body.roles?.[0];
        setRoleId(first?.id || "");
        setGrants(first?.permissionIds || []);
      })
      .catch((err) => setError(err.message));
  }, [tab, roleCampus]);

  async function createOrg(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await apiPost("/v1/orgs", { name, code });
      setNotice(created.name + " principal " + created.principalUsername + " / " + created.principalPassword);
      setName("");
      setCode("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function setActive(org, active) {
    setBusy(true);
    setError("");
    try {
      await apiPatch("/v1/orgs/" + encodeURIComponent(org.id), { isActive: active });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function setModule(org, id, enabled) {
    setBusy(true);
    setError("");
    try {
      await apiPatch("/v1/orgs/" + encodeURIComponent(org.id), { modules: { [id]: enabled } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function setPlatformModule(id, enabled) {
    setBusy(true);
    setError("");
    try {
      const saved = await apiPatch("/v1/platform/modules", { modules: { [id]: enabled } });
      setPlatformModules(saved.modules || {});
      setNotice(enabled ? id + " is on for every organisation." : id + " is off for every organisation. The platform god still has access.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function openCampus(campusId) {
    setBusy(true);
    setError("");
    try {
      await apiPost("/v1/auth/switch-campus", { campusId });
      await refresh();
      onOpened();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function openProfile(campusId) {
    setBusy(true);
    setError("");
    try {
      const branch = await apiGet("/v1/branches/" + encodeURIComponent(campusId));
      setProfile({
        id: branch.id,
        name: branch.name || "",
        address: branch.address || "",
        phone: branch.phone || "",
        email: branch.email || "",
        timezone: branch.timezone || "Asia/Kolkata",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiPatch("/v1/branches/" + encodeURIComponent(profile.id), {
        name: profile.name,
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
        timezone: profile.timezone,
      });
      setNotice("Campus profile saved.");
      setProfile(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function setAccountActive(account, isActive) {
    setBusy(true);
    setError("");
    try {
      await apiPatch("/v1/platform/accounts/" + encodeURIComponent(account.id), { isActive });
      setAccounts((rows) => rows.map((row) => row.id === account.id ? { ...row, isActive } : row));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(account) {
    setBusy(true);
    setError("");
    try {
      const reset = await apiPost("/v1/platform/accounts/" + encodeURIComponent(account.id) + "/reset-password", {});
      setNotice(reset.username + " temporary password " + reset.temporaryPassword);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function chooseRole(id) {
    const role = roles?.roles?.find((row) => row.id === id);
    setRoleId(id);
    setGrants(role?.permissionIds || []);
  }

  async function renameOrg(event, org) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await apiPatch("/v1/orgs/" + encodeURIComponent(org.id), { name: String(data.get("name") || ""), code: String(data.get("code") || "") });
      setNotice(org.code + " renamed.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addCampus(event, org) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const created = await apiPost("/v1/orgs/" + encodeURIComponent(org.id) + "/campuses", { name: String(data.get("name") || ""), code: String(data.get("code") || "") });
      setNotice(created.campus.code + " principal " + created.principalUsername + " / " + created.principalPassword);
      form.reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function archiveOrg(org) {
    setBusy(true);
    setError("");
    try {
      await apiPost("/v1/orgs/" + encodeURIComponent(org.id) + "/archive", { archived: !org.archived });
      setNotice(org.archived ? org.name + " is back on the list." : org.name + " is archived.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadBackup(org) {
    setBusy(true);
    setError("");
    try {
      const fixture = await apiGet("/v1/orgs/" + encodeURIComponent(org.id) + "/backup");
      const blob = new Blob([JSON.stringify(fixture, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = org.code + "-backup.json";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function previewRestore(event, org) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fixture = JSON.parse(await file.text());
      const preview = await apiPost("/v1/orgs/" + encodeURIComponent(org.id) + "/restore/preview", { fixture });
      setRestoreFor({ orgId: org.id, code: org.code, fixture, preview });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmRestore(event) {
    event.preventDefault();
    const confirm = String(new FormData(event.currentTarget).get("confirm") || "");
    setBusy(true);
    setError("");
    try {
      await apiPost("/v1/orgs/" + encodeURIComponent(restoreFor.orgId) + "/restore", { confirm, fixture: restoreFor.fixture });
      setNotice("Restored " + restoreFor.preview.students + " students.");
      setRestoreFor(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function setCampusFlag(org, campus, kind, value) {
    setBusy(true);
    setError("");
    try {
      if (kind === "maintenance") {
        await apiPatch("/v1/orgs/" + encodeURIComponent(org.id) + "/campuses/" + encodeURIComponent(campus.id) + "/maintenance", { readOnly: value });
      } else {
        await apiPatch("/v1/orgs/" + encodeURIComponent(org.id) + "/campuses/" + encodeURIComponent(campus.id) + "/modules", { modules: { [kind]: value } });
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function supportLogin(campusId) {
    setBusy(true);
    setError("");
    try {
      await apiPost("/v1/platform/support-login", { campusId });
      await refresh();
      onOpened();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function inviteGod(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const invited = await apiPost("/v1/platform/admins", { username: godName });
      setNotice(invited.username + " temporary password " + invited.temporaryPassword);
      setGodName("");
      const query = accountOrg ? "?orgId=" + encodeURIComponent(accountOrg) : "";
      setAccounts((await apiGet("/v1/platform/accounts" + query)).data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function retireGod(account) {
    setBusy(true);
    setError("");
    try {
      await apiPost("/v1/platform/admins/" + encodeURIComponent(account.id) + "/retire", {});
      setAccounts((rows) => rows.map((row) => row.id === account.id ? { ...row, roles: row.roles.filter((name) => name !== "PlatformAdmin") } : row));
      setNotice(account.username + " is no longer a platform god. Open sessions ended.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function findStudents(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const found = await apiGet("/v1/platform/students?q=" + encodeURIComponent(studentQuery.trim()));
      setStudents(found.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const sent = await apiPost("/v1/platform/broadcast", { title: messageTitle, body: messageBody });
      setNotice("Sent to " + sent.campuses + " campuses.");
      setMessageTitle("");
      setMessageBody("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiPatch("/v1/platform/templates/" + encodeURIComponent(templateId), { body: templateBody });
      setTemplates((rows) => rows.map((row) => row.id === templateId ? { ...row, body: templateBody } : row));
      setNotice("Print template saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveGrants() {
    const role = roles?.roles?.find((row) => row.id === roleId);
    if (!role || role.locked) return;
    setBusy(true);
    setError("");
    try {
      await apiPut("/v1/platform/roles/" + encodeURIComponent(roleId) + "/permissions", { permissionIds: grants });
      setNotice(role.name + " permissions saved for this campus.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const campuses = orgs.flatMap((org) => (org.campuses || []).map((campus) => ({ ...campus, orgName: org.name })));
  const visibleAccounts = accounts.filter((row) => {
    const haystack = (row.username + " " + (row.email || "") + " " + row.firstName + " " + row.lastName).toLowerCase();
    return haystack.includes(accountQuery.trim().toLowerCase());
  });
  const selectedRole = roles?.roles?.find((row) => row.id === roleId);

  return <div className="db-superadmin db-org-desk">
    <header>
      <div className="db-superadmin-brand"><Building2 size={22} /><div><strong>School World</strong><small>Control center</small></div></div>
      <div className="db-superadmin-user"><span>{user.email}</span><button type="button" onClick={onLogout}><LogOut size={15} /> Sign out</button></div>
    </header>
    <main>
      <div className="db-superadmin-title">
        <div>
          <h1>Organisations</h1>
          <p>One platform god for every organisation and campus, including Main Campus.</p>
        </div>
        <button type="button" className="db-superadmin-refresh" onClick={load} disabled={loading}><RefreshCw size={15} /> Refresh</button>
        <label><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Show archived</label>
      </div>
      <nav className="db-org-tabs" aria-label="Platform sections">
        {TABS.map(([id, label]) => <button type="button" key={id} className={tab === id ? "is-selected" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      {error && <div className="db-auth-error">{error}</div>}
      {notice && <div className="db-auth-success">{notice}</div>}

      {tab === "overview" && <section className="db-org-stats">
        {[["Schools", overview?.schools], ["Campuses", overview?.campuses], ["Active campuses", overview?.activeCampuses], ["Students", overview?.students], ["Active accounts", overview?.accounts], ["Outstanding", overview?.outstanding], ["Collected", overview?.collected]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{loading && !overview ? "…" : value ?? 0}</strong></article>)}
      </section>}
      {tab === "overview" && <form className="db-org-create" onSubmit={findStudents}>
        <label>Student across every organisation<input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} minLength={2} required /></label>
        <button type="submit" disabled={busy}>Search</button>
      </form>}
      {tab === "overview" && students.map((row) => <p key={row.id}>{row.admissionNo} · {row.firstName} {row.lastName || ""} · {row.orgName} · {row.campusCode || row.campusName}</p>)}
      {tab === "overview" && studentQuery && !students.length && <p>No students match.</p>}

      {(tab === "overview" || tab === "schools") && <>
        <form className="db-org-create" onSubmit={createOrg}>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} /></label>
          <label>Code<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required minLength={2} /></label>
          <button type="submit" className="primary-button" disabled={busy}>Create organisation</button>
        </form>
        {loading ? <p>Loading organisations…</p> : <div className="db-org-list">
          {orgs.map((org) => <article key={org.id}>
            <header>
              <div>
                <strong>{org.name}</strong>
                <span>{org.code}</span>
                <em>{org.active ? "Active" : "Suspended"}</em>
              </div>
              <button type="button" disabled={busy} onClick={() => setActive(org, !org.active)}>{org.active ? "Suspend" : "Reactivate"}</button>
            </header>
            {tab === "schools" && <>
              <form className="db-org-create" onSubmit={(event) => renameOrg(event, org)}>
                <label>Name<input name="name" defaultValue={org.name} key={org.id + org.name} required minLength={2} /></label>
                <label>Code<input name="code" defaultValue={org.code} key={org.id + org.code} required minLength={2} /></label>
                <button type="submit" disabled={busy}>Rename</button>
              </form>
              <form className="db-org-create" onSubmit={(event) => addCampus(event, org)}>
                <label>New campus<input name="name" required minLength={2} placeholder="Campus name" /></label>
                <label>Code<input name="code" required minLength={2} placeholder="CODE" /></label>
                <button type="submit" disabled={busy || org.archived}>Add campus</button>
              </form>
              <span>
                <button type="button" disabled={busy} onClick={() => downloadBackup(org)}>Download backup</button>
                <label>Restore<input type="file" accept="application/json" disabled={busy} onChange={(event) => previewRestore(event, org)} /></label>
                <button type="button" disabled={busy || org.code === "MAIN" || (org.campuses || []).some((campus) => campus.code === "MAIN")} onClick={() => archiveOrg(org)}>{org.archived ? "Unarchive" : "Archive"}</button>
              </span>
            </>}
            {tab === "schools" && <div className="db-org-modules">
              {ORG_MODULE_ROWS.map(([id, label]) => <label key={id}>
                <input type="checkbox" checked={org.modules?.[id] !== false} disabled={busy} onChange={(event) => setModule(org, id, event.target.checked)} />
                {label}
              </label>)}
            </div>}
            <ul>
              {(org.campuses || []).map((campus) => {
                const branch = (org.branches || []).find((row) => row.id === campus.id);
                const students = branch?.studentCount ?? campus.studentCount ?? 0;
                return <li key={campus.id}>
                  {tab === "schools" && <details>
                    <summary>Campus modules</summary>
                    <div className="db-org-modules">
                      {ORG_MODULE_ROWS.map(([id, label]) => <label key={id}>
                        <input type="checkbox" checked={campus.modules?.[id] !== false} disabled={busy} onChange={(event) => setCampusFlag(org, campus, id, event.target.checked)} />
                        {label}
                      </label>)}
                    </div>
                  </details>}
                  <span>{campus.name} · {campus.code || "no code"} · {students} students · {campus.principalUsername || "no principal"}</span>
                  <span>
                    <button type="button" disabled={busy} onClick={() => openProfile(campus.id)}>Profile</button>
                    <button type="button" disabled={busy} onClick={() => openCampus(campus.id)}>Open</button>
                    <button type="button" disabled={busy} onClick={() => supportLogin(campus.id)}>Support</button>
                    {tab === "schools" && <label><input type="checkbox" checked={campus.maintenance === true} disabled={busy} onChange={(event) => setCampusFlag(org, campus, "maintenance", event.target.checked)} /> Maintenance</label>}
                  </span>
                </li>;
              })}
            </ul>
          </article>)}
        </div>}
      </>}

      {tab === "modules" && <section className="db-org-list">
        <article>
          <header><strong>Platform switches</strong></header>
          <p>A platform switch that is off beats an organisation switch that is on. Opening a school still works for the platform god.</p>
          <div className="db-org-modules">
            {ORG_MODULE_ROWS.map(([id, label]) => <label key={id}>
              <input type="checkbox" checked={platformModules?.[id] !== false} disabled={busy || !platformModules} onChange={(event) => setPlatformModule(id, event.target.checked)} />
              {label}
            </label>)}
          </div>
        </article>
        <article>
          <header><strong>Campus role permissions</strong></header>
          <div className="db-org-create">
            <label>Campus<select value={roleCampus} onChange={(event) => setRoleCampus(event.target.value)}>
              {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.orgName} · {campus.code || campus.name}</option>)}
            </select></label>
            <label>Role<select value={roleId} onChange={(event) => chooseRole(event.target.value)}>
              {(roles?.roles || []).map((role) => <option key={role.id} value={role.id}>{role.name}{role.locked ? " · locked" : ""}</option>)}
            </select></label>
            <button type="button" disabled={busy || !selectedRole || selectedRole.locked} onClick={saveGrants}>Save permissions</button>
          </div>
          {selectedRole?.locked && <p>SuperAdmin and PlatformAdmin keep their existing grants.</p>}
          {selectedRole && !selectedRole.locked && <div className="db-org-grants">
            {(roles?.permissions || []).map((permission) => <label key={permission.id}>
              <input type="checkbox" checked={grants.includes(permission.id)} disabled={busy} onChange={(event) => {
                setGrants((current) => event.target.checked ? [...current, permission.id] : current.filter((id) => id !== permission.id));
              }} />
              {permission.module}.{permission.feature}.{permission.action}
            </label>)}
          </div>}
        </article>
      </section>}

      {tab === "people" && <section className="db-org-list">
        <form className="db-org-create" onSubmit={inviteGod}>
          <label>New platform god<input value={godName} onChange={(event) => setGodName(event.target.value)} minLength={3} required /></label>
          <button type="submit" disabled={busy}>Add</button>
        </form>
        <form className="db-org-create" onSubmit={sendMessage}>
          <label>Message to every principal<input value={messageTitle} onChange={(event) => setMessageTitle(event.target.value)} placeholder="Title" required minLength={2} /></label>
          <label>Body<textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} required /></label>
          <button type="submit" disabled={busy}>Send</button>
        </form>
        <form className="db-org-create" onSubmit={(event) => event.preventDefault()}>
          <label>Organisation<select value={accountOrg} onChange={(event) => setAccountOrg(event.target.value)}>
            <option value="">All organisations</option>
            {orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select></label>
          <label>Search<input value={accountQuery} onChange={(event) => setAccountQuery(event.target.value)} placeholder="Name or username" /></label>
        </form>
        {visibleAccounts.map((account) => <article key={account.id}>
          <header>
            <div>
              <strong>{account.username}</strong>
              <span>{account.orgName} · {account.campusCode || account.campusName}</span>
              <em>{account.roles.join(", ") || account.actorType}</em>
            </div>
            <span>
              <button type="button" disabled={busy} onClick={() => setAccountActive(account, !account.isActive)}>{account.isActive ? "Deactivate" : "Activate"}</button>
              <button type="button" disabled={busy} onClick={() => resetPassword(account)}>Reset password</button>
              {account.roles.includes("PlatformAdmin") && <button type="button" disabled={busy} onClick={() => retireGod(account)}>Retire platform access</button>}
            </span>
          </header>
        </article>)}
        {!visibleAccounts.length && <p>No accounts match.</p>}
      </section>}

      {tab === "templates" && <section className="db-org-list">
        <p>Edit a print template here. The school does not have to be open.</p>
        {templates.map((row) => <article key={row.id}><header><div><strong>{row.name}</strong><span>{row.kind}</span><em>{row.orgName} · {row.campusCode || row.campusName}</em></div>
          <button type="button" onClick={() => { setTemplateId(row.id); setTemplateBody(row.body || ""); }}>Edit</button>
        </header></article>)}
        {templateId && <form className="db-org-profile" onSubmit={saveTemplate}>
          <h2>Template body</h2>
          <label>Body<textarea value={templateBody} onChange={(event) => setTemplateBody(event.target.value)} required /></label>
          <button type="submit" className="primary-button" disabled={busy}>Save template</button>
        </form>}
        {!templates.length && <p>No print templates yet.</p>}
      </section>}

      {tab === "activity" && <section className="db-org-list">
        <form className="db-org-create" onSubmit={(event) => event.preventDefault()}>
          <label>Organisation<select value={activityOrg} onChange={(event) => setActivityOrg(event.target.value)}>
            <option value="">All organisations</option>
            {orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select></label>
          <label>Filter<input value={activityQuery} onChange={(event) => setActivityQuery(event.target.value)} placeholder="Action, record, or person" /></label>
          <button type="button" disabled={busy} onClick={() => {
            const params = new URLSearchParams({ format: "csv" });
            if (activityOrg) params.set("orgId", activityOrg);
            if (activityQuery.trim()) params.set("q", activityQuery.trim());
            downloadApiFile("/v1/platform/activity?" + params.toString(), "activity.csv").catch((err) => setError(err.message));
          }}>Export CSV</button>
        </form>
        {activity.map((row) => <article key={row.id}><header><div><strong>{row.action}</strong><span>{row.entity}</span><em>{row.school || "Platform"} · {row.actor || "system"} · {new Date(row.createdAt).toLocaleString()}</em></div></header></article>)}
        {!activity.length && <p>No audited changes yet.</p>}
      </section>}

      {restoreFor && <form className="db-org-profile" onSubmit={confirmRestore}>
        <h2>Restore preview</h2>
        <p>{restoreFor.preview.name} will write {restoreFor.preview.campuses} campuses, {restoreFor.preview.sessions} sessions, and {restoreFor.preview.students} students.</p>
        <label>Type {restoreFor.code} to confirm<input name="confirm" required /></label>
        <span>
          <button type="button" disabled={busy} onClick={() => setRestoreFor(null)}>Cancel</button>
          <button type="submit" className="primary-button" disabled={busy}>Restore</button>
        </span>
      </form>}
      {profile && <form className="db-org-profile" onSubmit={saveProfile}>
        <h2>Campus profile</h2>
        <label>Name<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required minLength={2} /></label>
        <label>Address<input value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} /></label>
        <label>Phone<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
        <label>Email<input value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
        <label>Timezone<input value={profile.timezone} onChange={(event) => setProfile({ ...profile, timezone: event.target.value })} required /></label>
        <span>
          <button type="button" disabled={busy} onClick={() => setProfile(null)}>Cancel</button>
          <button type="submit" className="primary-button" disabled={busy}>Save profile</button>
        </span>
      </form>}
    </main>
  </div>;
}
