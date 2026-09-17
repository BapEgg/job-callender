import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, useApp } from "./state";
import { Shell, HomePage, JobsPage, WriterPage } from "./pages";
import { createScreens } from "./screens";
import "./styles.css";
import "./profile-picker.css";
function App() {
  const context = useApp();
  const { route, act, state, ui, onInput, form, today, fixture, user, loaded } =
    context;
  const screens = createScreens(state, ui, act, onInput, form, today, fixture);
  let [page, id, sub] = route.split("/");
  if (!fixture && !user && !["login", "signup"].includes(page)) page = "login";
  let body;
  if (!loaded)
    body = (
      <div className="empty">
        <h2>연결 확인 중</h2>
        <p>개인 자료를 불러오고 있습니다.</p>
      </div>
    );
  else
    switch (page) {
      case "login":
        body = screens.authPage(false);
        break;
      case "signup":
        body = screens.authPage(true);
        break;
      case "onboarding":
        body = screens.onboardingPage();
        break;
      case "home":
        body = fixture ? <HomePage /> : screens.homePage();
        break;
      case "jobs":
        body = <JobsPage />;
        break;
      case "job":
        body = screens.jobPage(id);
        break;
      case "applications":
        body = screens.applicationsPage();
        break;
      case "workspace":
        body = screens.workspacePage(id, sub === "research");
        break;
      case "write":
        body = fixture && id === "a1" ? <WriterPage /> : screens.writerPage(id);
        break;
      case "submission":
        body = screens.submissionPage(id);
        break;
      case "prep":
        body = screens.prepPage(id);
        break;
      case "data":
        body = screens.dataPage();
        break;
      case "experiences":
        body = screens.experiencesPage();
        break;
      case "calendar":
        body = screens.calendarPage();
        break;
      case "settings":
        body = screens.settingsPage();
        break;
      default:
        body = screens.notFound();
    }
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          act("skip");
        }}
      >
        본문으로 이동
      </a>
      {["login", "signup", "onboarding"].includes(page) ? (
        body
      ) : (
        <Shell>{body}</Shell>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
