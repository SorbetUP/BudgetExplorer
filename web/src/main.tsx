import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './app.css'
import { BudgetTotalView } from './views/BudgetTotalView'
import { MyContributionView } from './views/MyContributionView'
import { DataExplorerView } from './views/DataExplorerView'
import { Header } from './components/Header'
import { buildTreeBlobUrl, buildDestBlobUrl, buildDestNatureBlobUrl, buildPerformanceBlobUrl, buildOfglBlobUrl, buildBudgetVertBlobUrl } from './live-api'

type View = 'budget' | 'me' | 'data'

function App() {
  const [view, setView] = useState<View>('budget')
  const [year, setYear] = useState<number>(2025)
  const [salaryNet, setSalaryNet] = useState<number>(2500)
  // Default to JSON (live API OFF on first load)
  const [liveApi, setLiveApi] = useState<boolean>(false)
  const [treeUrl, setTreeUrl] = useState<string>('')
  const [destUrl, setDestUrl] = useState<string>('')
  const [destNatureUrl, setDestNatureUrl] = useState<string>('')
  const [performanceUrl, setPerformanceUrl] = useState<string>('')
  const [ofglUrl, setOfglUrl] = useState<string>('')
  const [greenUrl, setGreenUrl] = useState<string>('')

  const dataBasePath = '.' // relative for GitHub Pages deployments

  const paths = useMemo(() => ({
    tree: treeUrl || `${dataBasePath}/data/state_budget_tree_${year}.json`,
    revenues: `${dataBasePath}/data/state_revenues_${year}.json`,
    green: greenUrl || `${dataBasePath}/data/budget_vert_${year}.json`,
    dest: destUrl || `${dataBasePath}/data/state_depenses_dest_${year}.json`,
    destNature: destNatureUrl || `${dataBasePath}/data/state_depenses_dest_nature_${year}.json`,
    performance: performanceUrl || `${dataBasePath}/data/state_performance_${year}.json`,
    ofgl: ofglUrl || `${dataBasePath}/data/ofgl_communes_${year}.json`,
  }), [year, treeUrl, destUrl, destNatureUrl, performanceUrl, ofglUrl, greenUrl])

  // Live API toggle persistence and tree URL management
  useEffect(() => {
    localStorage.setItem('liveApi', liveApi ? '1' : '0')
  }, [liveApi])

  useEffect(() => {
    let revoked: string | null = null
    const rev: string[] = []
    const setAndTrack = (setter: (v: string) => void) => (url: string | null) => { if (url) { setter(url); rev.push(url) } else { setter('') } }
    if (liveApi) {
      buildTreeBlobUrl(year).then(setAndTrack(setTreeUrl))
      buildDestBlobUrl(year).then(setAndTrack(setDestUrl))
      buildDestNatureBlobUrl(year).then(setAndTrack(setDestNatureUrl))
      buildPerformanceBlobUrl(year).then(setAndTrack(setPerformanceUrl))
      buildOfglBlobUrl(year).then(setAndTrack(setOfglUrl))
      buildBudgetVertBlobUrl(year).then(setAndTrack(setGreenUrl))
    } else {
      setTreeUrl(''); setDestUrl(''); setDestNatureUrl(''); setPerformanceUrl(''); setOfglUrl(''); setGreenUrl('')
    }
    return () => { rev.forEach((u) => URL.revokeObjectURL(u)) }
  }, [liveApi, year])

  return (
    <div className="app">
      <Header
        view={view}
        onViewChange={setView}
        year={year}
        onYearChange={setYear}
        salaryNet={salaryNet}
        onSalaryNetChange={setSalaryNet}
        liveApi={liveApi}
        onToggleLiveApi={setLiveApi}
      />
      {view === 'budget' && (
        <BudgetTotalView treeUrl={paths.tree} />
      )}
      {view === 'me' && (
        <MyContributionView treeUrl={paths.tree} salaryNetMonthly={salaryNet} />
      )}
      {view === 'data' && (
        <DataExplorerView
          destUrl={paths.dest}
          destNatureUrl={paths.destNature}
          performanceUrl={paths.performance}
          ofglUrl={paths.ofgl}
          revenuesUrl={paths.revenues}
          greenUrl={paths.green}
        />
      )}
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
