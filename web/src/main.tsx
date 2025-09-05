import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './app.css'
import { BudgetTotalView } from './views/BudgetTotalView'
import { MyContributionView } from './views/MyContributionView'
import { DataExplorerView } from './views/DataExplorerView'
import { Header } from './components/Header'

type View = 'budget' | 'me' | 'data'

function App() {
  const [view, setView] = useState<View>('budget')
  const [year, setYear] = useState<number>(2025)
  const [salaryNet, setSalaryNet] = useState<number>(2500)

  const dataBasePath = '.' // relative for GitHub Pages deployments

  const paths = useMemo(() => ({
    tree: `${dataBasePath}/data/state_budget_tree_${year}.json`,
    revenues: `${dataBasePath}/data/state_revenues_${year}.json`,
    green: `${dataBasePath}/data/budget_vert_${year}.json`,
    dest: `${dataBasePath}/data/state_depenses_dest_${year}.json`,
    destNature: `${dataBasePath}/data/state_depenses_dest_nature_${year}.json`,
    performance: `${dataBasePath}/data/state_performance_${year}.json`,
    ofgl: `${dataBasePath}/data/ofgl_communes_${year}.json`,
  }), [year])

  useEffect(() => {
    // no-op; placeholder for future year changes
  }, [year])

  return (
    <div className="app">
      <Header
        view={view}
        onViewChange={setView}
        year={year}
        onYearChange={setYear}
        salaryNet={salaryNet}
        onSalaryNetChange={setSalaryNet}
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
        />
      )}
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
