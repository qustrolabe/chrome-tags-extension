import {
  ErrorBoundary,
  hydrate,
  lazy,
  LocationProvider,
  prerender as ssr,
  Route,
  Router,
} from "preact-iso";
import "./index.css";

const Main = lazy(() => import("./app/App.tsx"));
const Options = lazy(() => import("./options/App.tsx"));

const App = () => (
  <LocationProvider>
    <ErrorBoundary>
      <Router>
        {/* .html endpoints needed for hydration while normal needed for prerender */}
        <Route path="/" component={Main} />
        <Route path="/index.html" component={Main} />

        <Route path="/options" component={Options} />
        <Route path="/options/index.html" component={Options} />
      </Router>
    </ErrorBoundary>
  </LocationProvider>
);

if (typeof window !== "undefined") {
  hydrate(<App />, document.getElementById("app")!);
}

export async function prerender() {
  return await ssr(<App />);
}
