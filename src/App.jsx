import { useEffect, useState } from 'react'
import { createPerson, getPeople, hasRemoteApi } from './api'
import { sourceMaterials } from './data'

const navItems = [
  { id: 'overview', label: '家谱总览', icon: '⌘' },
  { id: 'members', label: '成员管理', icon: '♧' },
  { id: 'materials', label: '资料库', icon: '▤' },
  { id: 'review', label: '审核中心', icon: '✓', badge: 3 },
]

const treePositions = {
  p1: [6, 44], p2: [25, 30], p3: [25, 65], p4: [45, 20], p5: [45, 42], p6: [45, 70],
  p7: [66, 13], p8: [66, 29], p9: [66, 51], p10: [86, 10], p11: [86, 28], p12: [86, 50],
}

function App() {
  const [people, setPeople] = useState([])
  const [active, setActive] = useState('overview')
  const [selectedId, setSelectedId] = useState('p4')
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPeople()
      .then(setPeople)
      .catch(() => setToast('数据加载失败，当前显示演示数据'))
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
      setToast(error.message)
    }
  }

  if (loading) return <div className="loading-screen"><div className="brand-mark">谱</div><p>正在打开家谱...</p></div>

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">谱</div><div><strong>谱源</strong><span>家谱数字档案</span></div></div>
        <div className="family-switcher"><span className="eyebrow">当前家谱</span><strong>曹氏家谱</strong><button aria-label="切换家谱">⌄</button></div>
        <nav className="main-nav" aria-label="主要导航">
          {navItems.map((item) => <button key={item.id} className={active === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="sync-status"><span className="status-dot" />{hasRemoteApi() ? '已连接百度云接口' : '本地演示模式'}</div><button className="help-link">？ 使用说明</button><div className="user-chip"><div className="avatar">曹</div><div><strong>家谱管理员</strong><span>管理员权限</span></div><span className="more">•••</span></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>我的家谱</span><b>/</b><strong>{navItems.find((item) => item.id === active)?.label}</strong></div><div className="top-actions"><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名、分支或地点" /><kbd>⌘ K</kbd></label><button className="icon-button" aria-label="通知">♢<i /></button><button className="primary-button" onClick={() => setShowModal(true)}><span>＋</span> 添加成员</button></div></header>

        {active === 'overview' && <Overview people={people} selected={selected} pending={pending} onSelect={setSelectedId} onAdd={() => setShowModal(true)} />}
        {active === 'members' && <Members people={filteredPeople} query={query} onSelect={(id) => { setSelectedId(id); setActive('overview') }} onAdd={() => setShowModal(true)} />}
        {active === 'materials' && <Materials />}
        {active === 'review' && <Review pending={pending} onSelect={(id) => { setSelectedId(id); setActive('overview') }} />}
      </main>

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {showModal && <AddPersonModal onClose={() => setShowModal(false)} onSubmit={handleCreate} />}
    </div>
  )
}

function Overview({ people, selected, pending, onSelect, onAdd }) {
  const generations = new Set(people.map((person) => person.generation)).size
  return <div className="page-wrap">
    <section className="welcome"><div><span className="eyebrow warm">家族档案 · 2026 年 08 月更新</span><h1>让家族记忆，<em>有迹可循。</em></h1><p>从一张手写家谱开始，把散落在时间里的名字、故事和关系重新连接起来。</p></div><div className="welcome-actions"><button className="secondary-button" onClick={() => window.alert('导入功能将在接入百度云函数后开放')}>⇧ 导入家谱</button><button className="primary-button" onClick={onAdd}><span>＋</span> 添加成员</button></div></section>
    <section className="stats-grid"><Stat label="家族成员" value={people.length} suffix="人" trend="本家谱已录入" icon="♧" tone="blue" /><Stat label="记录世代" value={generations} suffix="代" trend="从先祖至今" icon="⌁" tone="orange" /><Stat label="待确认信息" value={pending.length} suffix="条" trend="需要家人共同核对" icon="◷" tone="purple" /><Stat label="家谱完整度" value="38" suffix="%" trend="继续补充资料" icon="◌" tone="green" /></section>
    <section className="content-grid"><div className="panel tree-panel"><div className="panel-header"><div><span className="eyebrow">关系图谱</span><h2>家族脉络</h2></div><div className="panel-tools"><span className="live-dot">● 实时预览</span><button className="small-button">−</button><span className="zoom-value">100%</span><button className="small-button">＋</button><button className="small-button">⛶</button></div></div><div className="tree-legend"><span><i className="legend-line confirmed" />已确认</span><span><i className="legend-line pending" />待确认</span><span className="tree-tip">点击人物查看详细资料</span></div><Tree people={people} selectedId={selected?.id} onSelect={onSelect} /></div><PersonPanel person={selected} people={people} onEdit={() => window.alert('编辑表单将在下一步接入')} /></section>
    <section className="bottom-grid"><div className="panel activity-panel"><div className="panel-header"><div><span className="eyebrow">最近动态</span><h2>家谱正在变得完整</h2></div><button className="text-button">查看全部 →</button></div><div className="activity-list"><Activity icon="＋" color="blue" title="新增成员" detail="曹嘉树 已加入第五世 · 本房" time="刚刚" /><Activity icon="✓" color="green" title="资料确认" detail="曹致远 的出生地已完成核对" time="昨天" /><Activity icon="▧" color="orange" title="上传资料" detail="手写家谱总图 已归档至资料库" time="3 天前" /></div></div><div className="panel quote-panel"><div className="quote-mark">“</div><p>家谱不是一张纸，<br />是我们彼此相认的方式。</p><span>— 家族档案寄语</span><div className="quote-shape" /></div></section>
  </div>
}

function Tree({ people, selectedId, onSelect }) {
  const visible = people.filter((person) => treePositions[person.id])
  const lines = visible.flatMap((person) => (person.parentIds || []).map((parentId) => {
    const parent = treePositions[parentId]
    const child = treePositions[person.id]
    if (!parent || !child) return null
    return <line key={`${parentId}-${person.id}`} x1={`${parent[0] + 14}%`} y1={`${parent[1] + 3}%`} x2={`${child[0]}%`} y2={`${child[1] + 3}%`} />
  }).filter(Boolean))
  return <div className="tree-canvas"><svg className="tree-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{lines}</svg><div className="generation-labels"><span style={{ left: '5%' }}>一世</span><span style={{ left: '24%' }}>二世</span><span style={{ left: '44%' }}>三世</span><span style={{ left: '65%' }}>四世</span><span style={{ left: '85%' }}>五世</span></div>{visible.map((person) => { const [left, top] = treePositions[person.id]; return <button key={person.id} className={`person-node ${person.status === '待确认' ? 'is-pending' : ''} ${person.id === selectedId ? 'is-selected' : ''}`} style={{ left: `${left}%`, top: `${top}%` }} onClick={() => onSelect(person.id)}><span className="node-avatar">{person.name.slice(0, 1)}</span><span className="node-copy"><strong>{person.name}</strong><small>{person.branch} · {person.generation}世</small></span>{person.status === '待确认' && <i className="pending-dot" />}</button> })}<div className="tree-scale">可视范围：第一世至第五世</div></div>
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
  return <div className="page-wrap simple-page"><section className="page-heading"><div><span className="eyebrow">资料库</span><h1>家族资料</h1><p>集中保存原始家谱、口述记录与影像资料。</p></div><button className="primary-button" onClick={() => window.alert('文件上传将在接入百度云服务器后开放')}>⇧ 上传资料</button></section><div className="material-grid">{sourceMaterials.map((material) => <div className="panel material-card" key={material.id}><div className="material-icon">{material.icon}</div><div><span className="material-type">{material.type}</span><h3>{material.title}</h3><p>{material.date}</p></div><span className={`material-state ${material.state === '已归档' ? 'done' : ''}`}>{material.state}</span><button>···</button></div>)}</div><div className="panel empty-material"><div>▧</div><h2>把更多家族记忆放进来</h2><p>上传照片、证件、信件或口述资料，逐步构建完整的家族档案。</p><button className="secondary-button">选择文件</button></div></div>
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
