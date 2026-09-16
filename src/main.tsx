import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FixtureProvider, useFixture } from './state';
import { Shell, HomePage, JobsPage, WriterPage } from './pages';
import './styles.css';
function App(){const {route,act}=useFixture();return <><a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();act('skip');}}>본문으로 이동</a><Shell>{route==='jobs'?<JobsPage/>:route==='write/a1'?<WriterPage/>:<HomePage/>}</Shell></>;}
createRoot(document.getElementById('root')!).render(<StrictMode><FixtureProvider><App/></FixtureProvider></StrictMode>);
