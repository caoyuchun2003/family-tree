import { useEffect, useState } from 'react'
import { clearSession, createPerson, getPeople, hasRemoteApi, hasSession, login } from './api'
import { familyProfile, sourceMaterials } from './data'

const navItems = [
  { id: 'overview', label: '家谱总览', icon: '⌘' },
  { id: 'members', label: '成员管理', icon: '♧' },
  { id: 'materials', label: '资料库', icon: '▤' },
  { id: 'review', label: '审核中心', icon: '✓', badge: 3 },
]

function getTreeLayout(people) {
  const generations = [...new Set(people.map((person) => person.generation))].sort((a, b) => a - b)
  const positions = {}
  const maxGeneration = Math.max(generations.length - 1, 1)
  generations.forEach((generation, generationIndex) => {
    const group = people.filter((person) => person.generation === generation)
    group.forEach((person, index) => {
      const y = group.length === 1 ? 50 : 8 + (index * 84) / (group.length - 1)
      positions[person.id] = [6 + (generationIndex * 80) / maxGeneration, y]
    })
  })
  return { generations, positions }
}

function App() {
  const [people, setPeople] = useState([])
  const [active, setActive] = useState('overview')
  const [selectedId, setSelectedId] = useState('p4')
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [authPrompt, setAuthPrompt] = useState('')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(() => hasSession())
  const [treeZoom, setTreeZoom] = useState(0.9)
  const [treeFullscreen, setTreeFullscreen] = useState(false)

  useEffect(() => {
    setLoading(true)
    getPeople()
      .then(setPeople)
      .catch((error) => {
        if (error.status === 401) {
          clearSession()
          setAuthenticated(false)
        } else setToast(error.message || '数据加载失败')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const selected = people.find((person) => person.id === selectedId) || people[0]
  const pending = people.filter((person) => person.status === '待确认')
  const filteredPeople = people.filter((person) => `${person.name}${person.branch}${person.location}`.includes(query.trim()))

  function requestEditor(action) {
    if (!authenticated) {
      setAuthPrompt(action)
      return
    }
    if (action === 'add') setShowModal(true)
    else window.alert('编辑权限已验证；编辑表单将在下一步接入。')
  }

  async function handleEditorLogin(code) {
    await login(code)
    setAuthenticated(true)
    const action = authPrompt
    setAuthPrompt('')
    if (action === 'add') setShowModal(true)
    else setToast('编辑权限已验证')
  }

  async function handleCreate(form) {
    const person = {
      id: `local-${Date.now()}`,
      name: form.name,
      generation: Number(form.generation),
      branch: form.branch || '待分支',
      gender: form.gender,
      years: form.years || '信息待补充',
      location: form.location || '待补充',
      status: '待确认',
      note: '由家族成员新增，等待管理员核实。',
      parentIds: [],
    }
    try {
      const saved = await createPerson(person)
      setPeople((current) => [...current, saved])
      setSelectedId(saved.id)
      setShowModal(false)
      setToast('已添加成员，等待审核')
    } catch (error) {
      if (error.status === 401) {
        clearSession()
        setAuthenticated(false)
        setAuthPrompt('add')
      }
      setToast(error.message)
    }
  }

  if (loading) return <div className="loading-screen"><div className="brand-mark">谱</div><p>正在打开家谱...</p></div>

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">谱</div><div><strong>谱源</strong><span>家谱数字档案</span></div></div>
        <div className="family-switcher"><span className="eyebrow">当前家谱</span><strong>{familyProfile.title}</strong><button aria-label="切换家谱">⌄</button></div>
        <nav className="main-nav" aria-label="主要导航">
          {navItems.map((item) => <button key={item.id} className={active === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="sync-status"><span className="status-dot" />{hasRemoteApi() ? '已连接百度云接口' : '本地档案模式'}</div><button className="help-link">？ 使用说明</button><div className="user-chip"><div className="avatar">曹</div><div><strong>家谱管理员</strong><span>管理员权限</span></div><span className="more">•••</span></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>我的家谱</span><b>/</b><strong>{navItems.find((item) => item.id === active)?.label}</strong></div><div className="top-actions"><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名、分支或地点" /><kbd>⌘ K</kbd></label><button className="icon-button" aria-label="通知">♢<i /></button><button className="primary-button" onClick={() => requestEditor('add')}><span>＋</span> 添加成员</button></div></header>

        {active === 'overview' && <Overview people={people} selected={selected} pending={pending} onSelect={setSelectedId} onAdd={() => requestEditor('add')} onEdit={() => requestEditor('edit')} treeZoom={treeZoom} onTreeZoomChange={setTreeZoom} treeFullscreen={treeFullscreen} onTreeFullscreenChange={setTreeFullscreen} />}
        {active === 'members' && <Members people={filteredPeople} query={query} onSelect={(id) => { setSelectedId(id); setActive('overview') }} onAdd={() => requestEditor('add')} />}
        {active === 'materials' && <Materials />}
        {active === 'review' && <Review pending={pending} onSelect={(id) => { setSelectedId(id); setActive('overview') }} />}
      </main>

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {showModal && <AddPersonModal onClose={() => setShowModal(false)} onSubmit={handleCreate} />}
      {authPrompt && <LoginScreen onClose={() => setAuthPrompt('')} onLogin={handleEditorLogin} />}
    </div>
  )
}

function LoginScreen({ onClose, onLogin }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try { await onLogin(code.trim()) } catch (loginError) { setError(loginError.message) } finally { setSubmitting(false) }
  }
  return <div className="login-screen" onMouseDown={onClose}><div className="login-card" onMouseDown={(event) => event.stopPropagation()}><button className="close-login" type="button" onClick={onClose}>×</button><div className="brand"><div className="brand-mark">谱</div><div><strong>谱源</strong><span>家谱数字档案</span></div></div><span className="eyebrow warm">曹氏家谱 · 编辑权限</span><h1>验证后编辑家谱</h1><p>浏览家谱无需口令，新增或修改资料前请输入编辑口令。</p><form onSubmit={submit}><label>编辑口令<input autoFocus type="password" value={code} onChange={(event) => setCode(event.target.value)} placeholder="请输入编辑口令" required /></label>{error && <div className="login-error">{error}</div>}<button className="primary-button login-button" disabled={submitting}>{submitting ? '验证中…' : '验证编辑权限'}</button></form><small>口令由家谱管理员保管。</small></div></div>
}

function Overview({ people, selected, pending, onSelect, onAdd, onEdit, treeZoom, onTreeZoomChange, treeFullscreen, onTreeFullscreenChange }) {
  const generations = new Set(people.map((person) => person.generation)).size
  return <div className="page-wrap">
    <section className="welcome"><div><span className="eyebrow warm">{familyProfile.subtitle} · 2026 年 08 月更新</span><h1>把小石口的<em>家族根脉</em>留下来。</h1><p>目前已记录祖籍地点，姓名、字辈和世系只依据家谱原件与家人核对后入档。</p></div><div className="welcome-actions"><button className="secondary-button" onClick={() => window.alert('请先收集家谱原件、墓碑照片或家人口述资料')}>⇧ 导入资料</button><button className="primary-button" onClick={onAdd}><span>＋</span> 添加成员</button></div></section>
    <section className="stats-grid"><Stat label="已录入档案" value={people.length} suffix="条" trend="含 1 条祖源待考节点" icon="♧" tone="blue" /><Stat label="记录世代" value={generations} suffix="代" trend="具体世系尚未确认" icon="⌁" tone="orange" /><Stat label="待确认信息" value={pending.length} suffix="条" trend="需要家人共同核对" icon="◷" tone="purple" /><Stat label="资料完整度" value={familyProfile.completeness} suffix="%" trend="先补原始家谱与字辈" icon="◌" tone="green" /></section>
    <section className="content-grid"><div className={`panel tree-panel ${treeFullscreen ? 'tree-panel-fullscreen' : ''}`}><div className="panel-header"><div><span className="eyebrow">关系图谱</span><h2>家族脉络</h2></div><div className="panel-tools"><span className="live-dot">● 实时预览</span><button className="small-button" type="button" aria-label="缩小关系图" onClick={() => onTreeZoomChange(Math.max(0.5, Number((treeZoom - 0.1).toFixed(1))))}>−</button><span className="zoom-value">{Math.round(treeZoom * 100)}%</span><button className="small-button" type="button" aria-label="放大关系图" onClick={() => onTreeZoomChange(Math.min(1.5, Number((treeZoom + 0.1).toFixed(1))))}>＋</button><button className="small-button" type="button" aria-label={treeFullscreen ? '退出全屏' : '全屏显示'} onClick={() => onTreeFullscreenChange(!treeFullscreen)}>{treeFullscreen ? '×' : '⛶'}</button></div></div><div className="tree-legend"><span><i className="legend-line confirmed" />已确认</span><span><i className="legend-line pending" />待确认</span><span className="tree-tip">点击人物查看详细资料</span></div><Tree people={people} selectedId={selected?.id} onSelect={onSelect} zoom={treeZoom} /></div><PersonPanel person={selected} people={people} onEdit={onEdit} /></section>
    <section className="bottom-grid"><div className="panel activity-panel"><div className="panel-header"><div><span className="eyebrow">档案状态</span><h2>从祖源线索开始建谱</h2></div><button className="text-button">查看资料 →</button></div><div className="activity-list"><Activity icon="⌖" color="blue" title="已记录祖籍地点" detail={familyProfile.origin} time="今天" /><Activity icon="◷" color="orange" title="始迁祖待考" detail="需要家人提供姓名、字辈与原始家谱线索" time="待补" /><Activity icon="◌" color="purple" title="待收集原始资料" detail="家谱原件、墓碑照片、口述录音或老户口簿" time="待补" /></div></div><div className="panel quote-panel"><div className="quote-mark">“</div><p>先把能确认的<br /><em>一笔一画</em>留下来。</p><span>— 小石口家族档案</span><div className="quote-shape" /></div></section>
  </div>
}

function Tree({ people, selectedId, onSelect, zoom }) {
  const { generations, positions } = getTreeLayout(people)
  const visible = people.filter((person) => positions[person.id])
  const maxGroupSize = Math.max(...generations.map((generation) => people.filter((person) => person.generation === generation).length), 1)
  const stageWidth = Math.max(900, generations.length * 220)
  const stageHeight = Math.max(520, maxGroupSize * 66 + 100)
  const lines = visible.flatMap((person) => (person.parentIds || []).map((parentId) => {
    const parent = positions[parentId]
    const child = positions[person.id]
    if (!parent || !child) return null
    return <line key={`${parentId}-${person.id}`} x1={`${parent[0] + 14}%`} y1={`${parent[1] + 3}%`} x2={`${child[0]}%`} y2={`${child[1] + 3}%`} />
  }).filter(Boolean))
  return <div className="tree-viewport"><div className="tree-stage-frame" style={{ width: `${stageWidth * zoom}px`, height: `${stageHeight * zoom}px` }}><div className="tree-canvas" style={{ width: `${stageWidth}px`, height: `${stageHeight}px`, transform: `scale(${zoom})` }}><svg className="tree-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{lines}</svg><div className="generation-labels">{generations.map((generation, index) => <span key={generation} style={{ left: `${6 + (index * 80) / Math.max(generations.length - 1, 1)}%` }}>第{generation}世</span>)}</div>{visible.map((person) => { const [left, top] = positions[person.id]; return <button key={person.id} className={`person-node ${person.status === '待确认' ? 'is-pending' : ''} ${person.id === selectedId ? 'is-selected' : ''}`} style={{ left: `${left}%`, top: `${top}%` }} onClick={() => onSelect(person.id)}><span className="node-avatar">{person.name.slice(0, 1)}</span><span className="node-copy"><strong>{person.name}</strong><small>{person.branch} · {person.generation}世</small></span>{person.status === '待确认' && <i className="pending-dot" />}</button> })}<div className="tree-scale">可视范围：已录入世代；待考信息以橙点标记</div></div></div></div>
}

function PersonPanel({ person, people, onEdit }) {
  if (!person) return <aside className="panel person-panel empty-panel">选择一个成员查看资料</aside>
  const children = people.filter((candidate) => candidate.parentIds?.includes(person.id))
  return <aside className="panel person-panel"><div className="person-cover"><div className="cover-pattern" /><button className="close-detail" aria-label="关闭">×</button><div className="large-avatar">{person.name.slice(0, 1)}</div></div><div className="person-info"><div className="detail-heading"><div><span className="eyebrow">第 {person.generation} 世 · {person.branch}</span><h2>{person.name}</h2></div><button className="edit-button" onClick={onEdit}>编辑</button></div><span className={person.status === '待确认' ? 'status-pill pending-pill' : 'status-pill'}>{person.status === '待确认' ? '◷ 待家人确认' : '✓ 信息已确认'}</span><div className="detail-meta"><Meta label="生卒" value={person.years} /><Meta label="籍贯 / 居住地" value={person.location} /></div><div className="detail-section"><span className="eyebrow">人物简介</span><p>{person.note}</p></div><div className="detail-section"><div className="section-title"><span className="eyebrow">直系后代</span><span>{children.length} 人</span></div>{children.length ? <div className="children-list">{children.map((child) => <button key={child.id}><span className="mini-avatar">{child.name.slice(0, 1)}</span><span><strong>{child.name}</strong><small>第 {child.generation} 世 · {child.branch}</small></span><b>›</b></button>)}</div> : <p className="muted">暂无已录入的后代信息</p>}</div><button className="full-profile">查看完整人物档案 <span>→</span></button></div></aside>
}

function Meta({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div> }
function Activity({ icon, color, title, detail, time }) { return <div className="activity"><span className={`activity-icon ${color}`}>{icon}</span><div><strong>{title}</strong><p>{detail}</p></div><time>{time}</time></div> }
function Stat({ label, value, suffix, trend, icon, tone }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-text"><span>{label}</span><strong>{value}<small>{suffix}</small></strong><p>{trend}</p></div><span className="stat-arrow">↗</span></div> }

function Members({ people, query, onSelect, onAdd }) {
  return <div className="page-wrap simple-page"><section className="page-heading"><div><span className="eyebrow">成员管理</span><h1>家族成员</h1><p>{query ? `正在筛选“${query}”` : '维护家谱中的每一位成员与关系。'}</p></div><button className="primary-button" onClick={onAdd}>＋ 添加成员</button></section><div className="panel table-panel"><div className="table-toolbar"><strong>全部成员 <small>{people.length}</small></strong><span>按世代排序　⌄</span></div><div className="member-table"><div className="table-row table-head"><span>成员</span><span>世代 / 分支</span><span>生卒</span><span>地点</span><span>状态</span><span /></div>{people.map((person) => <button className="table-row" key={person.id} onClick={() => onSelect(person.id)}><span className="table-person"><span className="mini-avatar">{person.name.slice(0, 1)}</span><strong>{person.name}</strong></span><span>第 {person.generation} 世 · {person.branch}</span><span>{person.years}</span><span>{person.location}</span><span><i className={person.status === '待确认' ? 'table-status pending' : 'table-status'}>{person.status}</i></span><span>›</span></button>)}</div></div></div>
}

function Materials() {
  return <div className="page-wrap simple-page"><section className="page-heading"><div><span className="eyebrow">资料库</span><h1>家族资料</h1><p>围绕 {familyProfile.origin} 建立可追溯的真实档案。</p></div><button className="primary-button" onClick={() => window.alert('请准备好原始资料后上传：家谱、墓碑、户口簿或口述记录')}>⇧ 上传资料</button></section><div className="material-grid">{sourceMaterials.map((material) => <div className="panel material-card" key={material.id}>{material.asset ? <img className="material-thumb" src={material.asset} alt="手绘曹氏世系图缩略图" /> : <div className="material-icon">{material.icon}</div>}<div><span className="material-type">{material.type}</span><h3>{material.title}</h3><p>{material.date}</p></div><span className={`material-state ${material.state === '已归档' ? 'done' : ''}`}>{material.state}</span><button>···</button></div>)}</div><div className="panel empty-material"><div>▧</div><h2>先收集一手资料</h2><p>上传家谱原件、碑刻照片、老户口簿或家人口述，逐条核实后再扩展世系。</p><button className="secondary-button">选择文件</button></div></div>
}

function Review({ pending, onSelect }) {
  return <div className="page-wrap simple-page"><section className="page-heading"><div><span className="eyebrow">审核中心</span><h1>待确认信息</h1><p>这些内容需要家人一起核对，确认后才会成为正式档案。</p></div><span className="review-count">{pending.length} 条待处理</span></section><div className="review-list">{pending.map((person) => <button className="panel review-card" key={person.id} onClick={() => onSelect(person.id)}><span className="large-avatar small">{person.name.slice(0, 1)}</span><div><span className="eyebrow">第 {person.generation} 世 · {person.branch}</span><h3>{person.name}</h3><p>{person.note}</p></div><span className="review-action">去核对 →</span></button>)}{!pending.length && <div className="panel empty-material"><div>✓</div><h2>全部确认完成</h2><p>目前没有待家人核对的信息。</p></div>}</div></div>
}

function AddPersonModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', generation: 5, branch: '本房', gender: '男', years: '', location: '' })
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onSubmit={(event) => { event.preventDefault(); if (form.name.trim()) onSubmit(form) }} onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">新增档案</span><h2>添加家族成员</h2></div><button type="button" onClick={onClose}>×</button></div><label>姓名<input autoFocus required value={form.name} onChange={update('name')} placeholder="请输入姓名" /></label><div className="form-row"><label>世代<input type="number" min="1" max="20" value={form.generation} onChange={update('generation')} /></label><label>性别<select value={form.gender} onChange={update('gender')}><option>男</option><option>女</option></select></label></div><div className="form-row"><label>分支<input value={form.branch} onChange={update('branch')} /></label><label>地点<input value={form.location} onChange={update('location')} placeholder="待补充" /></label></div><label>生卒信息<input value={form.years} onChange={update('years')} placeholder="例如：1950 — 现在" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" type="submit">保存成员</button></div></form></div>
}

export default App
