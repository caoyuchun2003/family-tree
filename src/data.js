export const initialPeople = [
  { id: 'p1', name: '曹氏先祖', generation: 1, branch: '本房', gender: '男', years: '约 1890 — 1962', location: '山东平度', status: '已确认', note: '家谱根节点，资料来源为现存手写家谱。', parentIds: [] },
  { id: 'p2', name: '曹守仁', generation: 2, branch: '本房', gender: '男', years: '1916 — 1988', location: '山东平度', status: '已确认', note: '第二世，家中长子。', parentIds: ['p1'] },
  { id: 'p3', name: '曹守义', generation: 2, branch: '东支', gender: '男', years: '1920 — 1996', location: '山东平度', status: '待确认', note: '姓名与原图字迹仍需家人核对。', parentIds: ['p1'] },
  { id: 'p4', name: '曹明远', generation: 3, branch: '本房', gender: '男', years: '1942 — 2015', location: '青岛', status: '已确认', note: '第三世。', parentIds: ['p2'] },
  { id: 'p5', name: '曹明德', generation: 3, branch: '本房', gender: '男', years: '1948 — 现在', location: '青岛', status: '已确认', note: '第三世。', parentIds: ['p2'] },
  { id: 'p6', name: '曹明礼', generation: 3, branch: '东支', gender: '男', years: '1951 — 现在', location: '济南', status: '待确认', note: '待补充出生信息。', parentIds: ['p3'] },
  { id: 'p7', name: '曹致远', generation: 4, branch: '本房', gender: '男', years: '1972 — 现在', location: '北京', status: '已确认', note: '第四世。', parentIds: ['p4'] },
  { id: 'p8', name: '曹致和', generation: 4, branch: '本房', gender: '男', years: '1977 — 现在', location: '青岛', status: '已确认', note: '第四世。', parentIds: ['p4'] },
  { id: 'p9', name: '曹安然', generation: 4, branch: '本房', gender: '女', years: '1981 — 现在', location: '上海', status: '已确认', note: '第四世。', parentIds: ['p5'] },
  { id: 'p10', name: '曹嘉树', generation: 5, branch: '本房', gender: '男', years: '2003 — 现在', location: '北京', status: '待确认', note: '第五世，照片资料待上传。', parentIds: ['p7'] },
  { id: 'p11', name: '曹知行', generation: 5, branch: '本房', gender: '男', years: '2008 — 现在', location: '青岛', status: '已确认', note: '第五世。', parentIds: ['p8'] },
  { id: 'p12', name: '曹语桐', generation: 5, branch: '本房', gender: '女', years: '2010 — 现在', location: '上海', status: '已确认', note: '第五世。', parentIds: ['p9'] },
]

export const sourceMaterials = [
  { id: 'm1', title: '手写家谱总图', type: '原始照片', date: '2026-08-14', state: '待整理', icon: '▧' },
  { id: 'm2', title: '家族口述记录 - 第一批', type: '访谈记录', date: '待上传', state: '空白', icon: '◌' },
  { id: 'm3', title: '平度迁徙线索', type: '文字资料', date: '2026-08-12', state: '已归档', icon: '≋' },
]
