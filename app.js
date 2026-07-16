const { useState, useEffect, useRef } = React;
const h = React.createElement;

const STORAGE_KEY = 'electricalAuditTracker_v1';
const YN_OPTIONS = ['Yes','No','NA'];

const FIELD_GROUPS = [
  {
    title: 'Site Details',
    fields: [
      ['auditDate','Audit Date','date'],
      ['qeName','QE Name','select',['Abhishek Mallick','Bhaskar Das','Dipankar Das']],
      ['siteName','Site Name','text'],
      ['indusId','Indus ID','text'],
      ['refNo','Ref No.','text'],
      ['district','District','titleCaseText'],
      ['zone','Zone','locked','West Bengal'],
      ['partnerName','Partner Name','text'],
      ['stage','Stage','locked','E1'],
      ['siteType','Site Type','select',['GBT','RTT','RTP','ULS']],
      ['towerHeight','Tower Height','select',['40 m','30 m','15 m','12 m']],
      ['towerType','Tower Type','select',['Eco','VT','GBM','Pole']],
      ['vtFps','VT Tower FPS Installed','yn'],
      ['siteLevelling','Site Levelling','yn'],
      ['odBedHeight','OD Bed Height','select',['NA','0.6 m','1.2 m','2 m']],
      ['railing','Railing As Per Drawing','yn'],
      ['ladder','Ladder As Per Drawing','yn'],
    ]
  },
  {
    title: 'Electrical Systems',
    fields: [
      ['rectifierChecked','Rectifier Checked','yn'],
      ['d25Alarm','D25 Alarm Connector Installed','yn'],
      ['odCabinetAlarm','OD Cabinet Alarm Extended To SMPS','yn'],
      ['smpsSetting','SMPS Setting Checked','yn'],
      ['smpsOdAlarm','SMPS/OD Rack Alarm Checked','yn'],
      ['busBarGalv','Bus Bar Galvanised Value','numberUnit',{unit:'µ'}],
      ['giStripsGalv','GI Strips Galvanisation Value','numberUnit',{unit:'µ'}],
      ['feAvailable','FE Available','yn'],
      ['ofcDuct','OFC Duct Pipe Availability','yn'],
      ['systemPole','System Pole Availability','yn'],
      ['odTxRack','OD Tx Rack Availability','yn'],
      ['ebAvailable','EB Available','yn'],
    ]
  },
  {
    title: 'Measurements & Status',
    fields: [
      ['earthingValue','Earthing Value (Ohms)','numericAlert',{threshold:2, unit:'Ω'}],
      ['enVoltage','EN Voltage','numericAlert',{threshold:5, unit:'V'}],
      ['solarStatus','Solar Status','yn'],
      ['onlineJms','Online JMS','selectRemark',{options:['Yes','No'], remarkKey:'onlineJmsRemarks', trigger:'No', remarkLabel:'Online JMS Remarks'}],
      ['checkSheet','Check Sheet','selectRemark',{options:['Yes (Accepted)','Yes (Rejected)','No'], remarkKey:'checkSheetRemarks', trigger:['No','Yes (Rejected)'], remarkLabel:'Check Sheet Remarks'}],
      ['status','Overall Status (Auto)','computed'],
    ]
  },
  {
    title: 'Visit Details',
    fields: [
      ['inTime','In Time','time'],
      ['outTime','Out Time','time'],
      ['transportMode','Mode Of Transport','select',['Public','Private']],
      ['distance','Distance','text'],
    ]
  },
];

const PP_CATEGORIES = [
  { key:'rectifiedPunchPoints', label:'Rectified Punch Points' },
  { key:'punchPoints', label:'Open Punch Points' },
  { key:'observations', label:'Observations' },
];

function cryptoId(){
  return 'a_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
}

function capitalizeWords(str){
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function parseNum(str){
  if(str === undefined || str === null || str === '') return null;
  const m = String(str).match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function ynClass(val){
  if(val === 'Yes') return 'on-green';
  if(val === 'No') return 'on-red';
  return '';
}

function statusBadgeClass(status){
  const s = (status||'').toUpperCase();
  if(s === 'FA') return 'green';
  if(s === 'NA') return 'red';
  if(!s) return 'grey';
  return 'amber';
}

function formatPPList(list){
  if(!list || list.length === 0) return '';
  return list.map((p,i) => {
    const codeRaw = (p.code || '').trim();
    const codeIsEmpty = !codeRaw || /^[-—]+$/.test(codeRaw);
    return codeIsEmpty ? `${i+1}. ${p.desc}` : `${i+1}. (${codeRaw}) ${p.desc}`;
  }).join('\n');
}

function buildCurrentStatusText(a){
  let txt = `Indus Id:-${a.indusId || ''}\nSite Name:-${a.siteName || ''}\nStage:-${a.stage || ''}\n\n`;
  const combined = [...(a.punchPoints || []), ...(a.observations || [])];
  txt += formatPPList(combined);
  return txt;
}

function buildFullStatusText(a){
  const jmsLine = (a.onlineJms === 'No' && a.onlineJmsRemarks) ? `${a.onlineJms} (${a.onlineJmsRemarks})` : (a.onlineJms || '');
  const csLine = (a.checkSheet === 'No' && a.checkSheetRemarks) ? `${a.checkSheet} (${a.checkSheetRemarks})` : (a.checkSheet || '');

  const lines = [
    `Audit date :- ${a.auditDate || ''}`,
    `QE Name :- ${a.qeName || ''}`,
    `Site Name :- ${a.siteName || ''}`,
    `Indus ID :- ${a.indusId || ''}`,
    `Ref No.- ${a.refNo || ''}`,
    `District :- ${a.district || ''}`,
    `Zone- ${a.zone || ''}`,
    `Partner Name :- ${a.partnerName || ''}`,
    `Stage- ${a.stage || ''}`,
    `Site type (GBT/RTT/RTP/ULS) :- ${a.siteType || ''}`,
    `Tower Height- ${a.towerHeight || ''}`,
    `Tower Type (Eco/VT/GBM/Pole)- ${a.towerType || ''}`,
    `If VT tower FPS installed (Yes/No) :- ${a.vtFps || ''}`,
    `Site levelling (Yes/No) :- ${a.siteLevelling || ''}`,
    `OD Bed Height :- ${a.odBedHeight || ''}`,
    `Railing as per drawing (Yes/ No) :- ${a.railing || ''}`,
    `Ladder as per drawing (Yes / No) :- ${a.ladder || ''}`,
    `Rectifier checked (Yes/ No) :- ${a.rectifierChecked || ''}`,
    `D25 Alarm connector installed (Yes/No) :- ${a.d25Alarm || ''}`,
    `OD Cabinet Alarm extended to SMPS (Yes/No) :- ${a.odCabinetAlarm || ''}`,
    `SMPS setting checked (Yes/No) :- ${a.smpsSetting || ''}`,
    `SMPS/OD rack alarm checked (Yes/No) :- ${a.smpsOdAlarm || ''}`,
    `Bus bar galvanised value :- ${a.busBarGalv ? a.busBarGalv + ' micron' : ''}`,
    `GI strips Galvanisation value of pole :- ${a.giStripsGalv ? a.giStripsGalv + ' micron' : ''}`,
    `FE available(Yes/No) :- ${a.feAvailable || ''}`,
    `OFC Duct Pipe Availability (Yes/No) :- ${a.ofcDuct || ''}`,
    `System Pole Availability (Yes/No) :- ${a.systemPole || ''}`,
    `OD Tx Rack Availability (Yes/No) :- ${a.odTxRack || ''}`,
    `EB available (Yes/No) :- ${a.ebAvailable || ''}`,
    ``,
    `Earthing value (Ohms) :- ${a.earthingValue ? a.earthingValue + ' Ω' : ''}`,
    `EN Voltage :- ${a.enVoltage ? a.enVoltage + ' V' : ''}`,
    `Solar Status (Yes/No) :- ${a.solarStatus || ''}`,
    `Online JMS(Yes/no):- ${jmsLine}`,
    `Check sheet (Yes/no) :- ${csLine}`,
    ``,

    // Points list
    ];
    if ((a.rectifiedPunchPoints || []).length > 0) {
      lines.push(
        "",
        "Rectified Punch Points :-",
        formatPPList(a.rectifiedPunchPoints),
      );
    }
    if ((a.punchPoints || []).length > 0) {
      lines.push("", "Punch Points :-", formatPPList(a.punchPoints));
    }
    if ((a.observations || []).length > 0) {
      lines.push("", "Observations :-", formatPPList(a.observations));
    }

    // Out details
    lines.push(
      "",
      `In Time :- ${a.inTime || ""}`,
      `Out time :- ${a.outTime || ""}`,
      `Mode of Transport :- ${a.transportMode || ""}`,
      `Distance :- ${a.distance || ""}`,
      `Status :- ${a.status || ""}`,
    );
  
  return lines.join('\n');
}

async function copyToClipboard(text){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      return true;
    }
  }catch(e){ /* fall through */ }
  try{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }catch(e){
    return false;
  }
}

function seedAudit(){
  return {
    id: cryptoId(),
    auditDate:'2026-07-04', qeName:'Abhishek Mallick', siteName:'Banga', indusId:'IN-3562400',
    refNo:'R/NN-977906', district:'South 24 Parganas', zone:'West Bengal', partnerName:'Matri International',
    stage:'E1', siteType:'GBT', towerHeight:'40', towerType:'Eco',
    vtFps:'NA', siteLevelling:'No', odBedHeight:'0.6M', railing:'NA', ladder:'NA',
    rectifierChecked:'Yes', d25Alarm:'Yes', odCabinetAlarm:'Yes', smpsSetting:'Yes', smpsOdAlarm:'Yes',
    busBarGalv:'100', giStripsGalv:'100', feAvailable:'Yes', ofcDuct:'Yes', systemPole:'Yes',
    odTxRack:'Yes', ebAvailable:'Yes',
    earthingValue:'0.12', enVoltage:'2.12', solarStatus:'Yes',
    onlineJms:'No', onlineJmsRemarks:'PP open',
    checkSheet:'Yes (Accepted)', checkSheetRemarks:'',
    rectifiedPunchPoints:[
      {code:'G-1', desc:'PTW not provided'},
      {code:'ELEC-15', desc:'BB, MPPT commissioning report not provided'},
      {code:'ELEC-17', desc:'EB MCCB phase separator not installed'},
      {code:'—', desc:'Pole, cable tray earthing connection pending'},
      {code:'ELEC-43', desc:'BTS Pole not installed'},
      {code:'Str-03', desc:'Hilti not done'},
      {code:'ELEC-41', desc:'Saddling work pending'},
      {code:'Str-13', desc:'Silicon work pending'},
      {code:'T13', desc:'Zinc spray required at welding place'},
      {code:'ELEC-28', desc:'Power socket not installed'},
    ],
    punchPoints:[
      {code:'ELEC-03', desc:'EB cable tied with another pole without insulator'},
      {code:'Fenc-06', desc:'Site water logged and muddy'},
      {code:'ELEC-20', desc:'SP red phase indicator cover missing'},
      {code:'T6', desc:'Solar shrink comb work in progress'},
      {code:'ELEC-17', desc:'Spreader link not available at EB MCCB'},
      {code:'F39', desc:'Back filling and soil levelling required'},
      {code:'ELEC-15', desc:'SMPS commissioning report not provided'},
      {code:'ELEC-20', desc:'Solar generation not proper (close to zero)'},
    ],
    observations:[],
    inTime:'11:17', outTime:'23:27', transportMode:'Public', distance:'60 KM', status:'NA',
  };
}

function loadAudits(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      try{ return JSON.parse(raw); }catch(e){ /* corrupt data, fall through to seed */ }
    }
  }catch(e){
    console.warn('localStorage unavailable, data will not persist between sessions:', e);
  }
  return [seedAudit()];
}

function saveAudits(list){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }catch(e){
    console.warn('Could not save to localStorage, data will not persist:', e);
  }
}

// ---------- Field renderer ----------

function Field(props){
  const { fieldDef, draft, onChange } = props;
  const key = fieldDef[0], label = fieldDef[1], type = fieldDef[2], options = fieldDef[3];
  const value = draft[key] !== undefined ? draft[key] : '';

  if(type === 'yn'){
    return h('div', {className:'field', key:key},
      h('label', null, label),
      h('div', {className:'yn-wrap'},
        h('span', {className:'yn-dot ' + ynClass(value)}),
        h('select', {value:value, onChange:e=>onChange(key,e.target.value)},
          YN_OPTIONS.map(o => h('option', {key:o, value:o}, o))
        )
      )
    );
  }

  if(type === 'select'){
    return h('div', {className:'field', key:key},
      h('label', null, label),
      h('select', {value:value, onChange:e=>onChange(key,e.target.value)},
        options.map(o => h('option', {key:o, value:o}, o))
      )
    );
  }

  if(type === 'locked'){
    return h('div', {className:'field', key:key},
      h('label', null, label),
      h('input', {type:'text', value:options, disabled:true, readOnly:true, style:{opacity:0.65, cursor:'not-allowed'}})
    );
  }

  if(type === 'computed'){
    const cls = value === 'FA' ? 'good' : 'bad';
    return h('div', {className:'field', key:key},
      h('label', null, label),
      h('input', {type:'text', value:value, disabled:true, readOnly:true, className:'status-computed ' + cls}),
      h('span', {className:'status-hint'}, 'FA when no open punch points, NA otherwise')
    );
  }

  if(type === 'numericAlert'){
    const num = parseNum(value);
    const alertNow = (num !== null && num > options.threshold);
    return h('div', {className:'field', key:key},
      h('label', null, label),
      h('div', {style:{display:'flex', alignItems:'center', gap:8}},
        h('input', {type:'number', value:value, step:'any', className: alertNow ? 'field-alert' : '', style:{flex:1}, onChange:e=>onChange(key,e.target.value)}),
        h('span', {style:{fontFamily:'var(--mono)', color:'var(--muted)', fontSize:13}}, options.unit)
      ),
      h('span', {className:'status-hint'}, `Flags red above ${options.threshold}${options.unit}`)
    );
  }

  if(type === 'numberUnit'){
    return h('div', {className:'field', key:key},
      h('label', null, label),
      h('div', {style:{display:'flex', alignItems:'center', gap:8}},
        h('input', {type:'number', value:value, step:'any', style:{flex:1}, onChange:e=>onChange(key,e.target.value)}),
        h('span', {style:{fontFamily:'var(--mono)', color:'var(--muted)', fontSize:13}}, options.unit)
      )
    );
  }

  if(type === 'titleCaseText'){
    return h('div', {className:'field', key:key},
      h('label', null, label),
      h('input', {
        type:'text', value:value,
        onChange:e=>onChange(key,e.target.value),
        onBlur:e=>onChange(key, capitalizeWords(e.target.value.trim()))
      })
    );
  }

  if(type === 'time'){
    return h('div', {className:'field', key:key},
      h('label', null, label),
      h('input', {type:'time', value:value, lang:'en-GB', step:'60', onChange:e=>onChange(key,e.target.value)})
    );
  }

  if(type === 'selectRemark'){
    const remarkVal = draft[options.remarkKey] !== undefined ? draft[options.remarkKey] : '';
    const showRemark = Array.isArray(options.trigger) ? options.trigger.includes(value) : value === options.trigger;
    const elems = [
      h('div', {className:'field', key:key},
        h('label', null, label),
        h('select', {value:value, onChange:e=>onChange(key,e.target.value)},
          options.options.map(o => h('option', {key:o, value:o}, o))
        )
      )
    ];
    if(showRemark){
      elems.push(
        h('div', {className:'field wide', key:key+'_remark'},
          h('label', null, options.remarkLabel || 'Remarks'),
          h('input', {type:'text', value:remarkVal, placeholder:'Add remarks...', onChange:e=>onChange(options.remarkKey, e.target.value)})
        )
      );
    }
    return elems;
  }

  // default: text / date
  return h('div', {className:'field', key:key},
    h('label', null, label),
    h('input', {type:type, value:value, onChange:e=>onChange(key,e.target.value)})
  );
}

function FieldGroupSection(props){
  const { group, draft, onChange } = props;
  const fields = group.fields.map(f => Field({fieldDef:f, draft:draft, onChange:onChange})).flat();
  return h('div', {className:'section', key:group.title},
    h('div', {className:'section-title'}, group.title),
    h('div', {className:'field-grid'}, fields)
  );
}

// ---------- Punch point list ----------

function PunchRow(props){
  const { item, onUpdate, onRemove, onMove, otherCategories } = props;
  return h('div', {className:'pp-row'},
    h('input', {type:'text', placeholder:'Code', value:item.code, className:'pp-code',
      onChange:e=>onUpdate('code', e.target.value)}),
    h('input', {type:'text', placeholder:'Description', value:item.desc, className:'pp-desc',
      onChange:e=>onUpdate('desc', e.target.value)}),
    h('select', {
      className:'pp-move', value:'', title:'Move to another category',
      onChange:e=>{ if(e.target.value) onMove(e.target.value); }
    },
      h('option', {value:''}, 'Move to...'),
      otherCategories.map(c => h('option', {key:c.key, value:c.key}, c.label))
    ),
    h('button', {type:'button', className:'icon-btn del', onClick:onRemove}, '✕')
  );
}

function PunchList(props){
  const { items, onUpdateItem, onRemoveItem, onMoveItem, otherCategories } = props;
  return h('div', {className:'pp-list'},
    (items||[]).map((item, i) => h(PunchRow, {
      key:i, item:item,
      otherCategories: otherCategories,
      onUpdate:(field,val)=>onUpdateItem(i,field,val),
      onRemove:()=>onRemoveItem(i),
      onMove:(targetKey)=>onMoveItem(i, targetKey)
    }))
  );
}

// ---------- Add Punch Point modal (step 2) ----------

function PunchPointModal(props){
  const { onClose, onConfirm } = props;
  const [category, setCategory] = useState('rectifiedPunchPoints');
  const [code, setCode] = useState('');
  const [desc, setDesc] = useState('');
  const descRef = useRef(null);

  useEffect(()=>{
    if(descRef.current) descRef.current.focus();
  }, []);

  function handleConfirm(){
    const trimmedDesc = desc.trim();
    if(!trimmedDesc){
      if(descRef.current) descRef.current.focus();
      return;
    }
    onConfirm(category, {code: code.trim(), desc: trimmedDesc});
  }

  return h('div', {className:'overlay', style:{zIndex:70}, onClick:e=>{ if(e.target === e.currentTarget) onClose(); }},
    h('div', {className:'drawer', style:{width:'min(420px, 92vw)'}},
      h('div', {className:'drawer-header'},
        h('h2', null, 'Add Punch Point'),
        h('button', {className:'icon-btn', onClick:onClose}, '✕')
      ),
      h('div', {className:'drawer-body'},
        h('div', {className:'field', style:{marginBottom:18}},
          h('label', null, 'Category'),
          h('div', {className:'pp-radio-group', style:{flexDirection:'column', gap:12, marginTop:6}},
            PP_CATEGORIES.map(c => h('label', {key:c.key},
              h('input', {
                type:'radio', name:'ppCategoryModal', value:c.key,
                checked: category === c.key,
                onChange:()=>setCategory(c.key)
              }),
              ' ' + c.label
            ))
          )
        ),
        h('div', {className:'field', style:{marginBottom:14}},
          h('label', null, 'Code (optional)'),
          h('input', {type:'text', placeholder:'e.g. ELEC-15', style:{width:'100%'}, value:code, onChange:e=>setCode(e.target.value)})
        ),
        h('div', {className:'field'},
          h('label', null, 'Description'),
          h('input', {type:'text', placeholder:'Describe the point', style:{width:'100%'}, value:desc, ref:descRef, onChange:e=>setDesc(e.target.value)})
        )
      ),
      h('div', {className:'drawer-footer'},
        h('button', {className:'btn', onClick:onClose}, 'Cancel'),
        h('button', {className:'btn primary', onClick:handleConfirm}, 'Add Point')
      )
    )
  );
}

// ---------- Audit drawer (add/edit) ----------

function blankDraft(){
  return {
    zone:'West Bengal', stage:'E1', qeName: 'Abhishek Mallick',
    auditDate: new Date().toISOString().split('T')[0],
    rectifiedPunchPoints:[], punchPoints:[], observations:[],
  };
}

function AuditDrawer(props){
  const { audit, onClose, onSave } = props;
  const [draft, setDraft] = useState(()=> audit ? {...audit} : blankDraft());
  const [ppModalOpen, setPpModalOpen] = useState(false);

  function updateField(key, value){
    setDraft(prev => ({...prev, [key]: value}));
  }

  function updatePPItem(listKey, idx, field, value){
    setDraft(prev => {
      const arr = [...(prev[listKey]||[])];
      arr[idx] = {...arr[idx], [field]: value};
      return {...prev, [listKey]: arr};
    });
  }

  function removePPItem(listKey, idx){
    setDraft(prev => {
      const arr = [...(prev[listKey]||[])];
      arr.splice(idx,1);
      return {...prev, [listKey]: arr};
    });
  }

  function movePPItem(fromKey, idx, toKey){
    setDraft(prev => {
      const fromArr = [...(prev[fromKey]||[])];
      const [moved] = fromArr.splice(idx,1);
      if(!moved) return prev;
      const toArr = [...(prev[toKey]||[]), moved];
      return {...prev, [fromKey]: fromArr, [toKey]: toArr};
    });
  }

  function addPunchPoint(listKey, item){
    setDraft(prev => ({...prev, [listKey]: [...(prev[listKey]||[]), item]}));
    setPpModalOpen(false);
  }

  const computedStatus = (draft.punchPoints||[]).length > 0 ? 'NA' : 'FA';
  const displayDraft = {...draft, status: computedStatus};

  function handleSave(){
    const finalData = {...draft, status: computedStatus};
    if(!finalData.id) finalData.id = cryptoId();
    onSave(finalData);
  }

  return h('div', {className:'overlay'},
    h('div', {className:'drawer'},
      h('div', {className:'drawer-header'},
        h('h2', null, audit ? 'Edit Audit' : 'New Audit'),
        h('button', {className:'icon-btn', onClick:onClose}, '✕')
      ),
      h('div', {className:'drawer-body'},
        FIELD_GROUPS.map(group => FieldGroupSection({group:group, draft:displayDraft, onChange:updateField})),
        h('div', {className:'section'},
          h('div', {className:'section-title'}, 'Punch Points'),
          h('button', {type:'button', className:'btn primary', style:{marginBottom:18}, onClick:()=>setPpModalOpen(true)}, '+ Add Points'),
          PP_CATEGORIES.map(cat => h('div', {className:'pp-subsection', key:cat.key},
            h('div', {className:'pp-subtitle'}, cat.label),
            h(PunchList, {
              items: draft[cat.key]||[],
              otherCategories: PP_CATEGORIES.filter(c => c.key !== cat.key),
              onUpdateItem: (idx,field,val)=>updatePPItem(cat.key, idx, field, val),
              onRemoveItem: (idx)=>removePPItem(cat.key, idx),
              onMoveItem: (idx,toKey)=>movePPItem(cat.key, idx, toKey),
            })
          ))
        )
      ),
      h('div', {className:'drawer-footer'},
        h('button', {className:'btn', onClick:onClose}, 'Cancel'),
        h('button', {className:'btn primary', onClick:handleSave}, 'Save Audit')
      )
    ),
    ppModalOpen && h(PunchPointModal, {
      onClose: ()=>setPpModalOpen(false),
      onConfirm: addPunchPoint
    })
  );
}

// ---------- Dashboard table ----------

function AuditRow(props){
  const { audit, onOpen, onDelete, onCopyCurrent, onCopyFull } = props;

  const badgeCls = statusBadgeClass(audit.status);
  const openCount = (audit.punchPoints||[]).length;
  const fixedCount = (audit.rectifiedPunchPoints||[]).length;
  const obsCount = (audit.observations||[]).length;

  function stopAnd(fn){
    return (e) => { e.stopPropagation(); fn(); };
  }

  return h('tr', {onClick: onOpen},
    h('td', null, h('span', {className:'badge ' + badgeCls}, audit.status || '—')),
    h('td', {className:'site-cell'},
      h('div', {className:'site-name'}, audit.siteName || ''),
      h('div', {className:'site-sub'}, audit.indusId || '')
    ),
    h('td', null, audit.district || '—', h('br'), h('span', {style:{color:'var(--muted)', fontSize:11}}, audit.zone||'')),
    h('td', {style:{fontFamily:'var(--mono)'}}, audit.auditDate || '—'),
    h('td', null, audit.qeName || '—'),
    h('td', null, h('div', {className:'pp-counts'},
      h('span', {className:'open'}, `${openCount} open`),
      h('span', {className:'fixed'}, `${fixedCount} fixed`),
      h('span', {className:'obs'}, `${obsCount} obs`)
    )),
    h('td', null, h('div', {className:'row-actions'},
      h('button', {className:'icon-btn', title:'Copy current status', onClick: stopAnd(onCopyCurrent)}, '🧾'),
      h('button', {className:'icon-btn', title:'Copy full status', onClick: stopAnd(onCopyFull)}, '📋'),
      h('button', {className:'icon-btn', title:'Edit', onClick: stopAnd(onOpen)}, '✎'),
      h('button', {className:'icon-btn del', title:'Delete', onClick: stopAnd(onDelete)}, '🗑')
    ))
  );
}

function StatsRow(props){
  const { audits } = props;
  const total = audits.length;
  const fa = audits.filter(a => (a.status || '').toUpperCase() === 'FA').length;
  const na = audits.filter(a => (a.status || '').toUpperCase() === 'NA').length;

  return h('div', {className:'stats-row'},
    h('div', {className:'stat-card'}, h('div', {className:'num'}, total), h('div', {className:'label'}, 'Total Audits')),
    h('div', {className:'stat-card ok'}, h('div', {className:'num'}, fa), h('div', {className:'label'}, 'FA Sites')),
    h('div', {className:'stat-card warn'}, h('div', {className:'num'}, na), h('div', {className:'label'}, 'NA Sites'))
  );
}

// ---------- App ----------

function App(){
  const [audits, setAudits] = useState(loadAudits);
  const [search, setSearch] = useState('');
  const [drawerAudit, setDrawerAudit] = useState(undefined); // undefined = closed, null = new, object = edit
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  useEffect(()=>{ saveAudits(audits); }, [audits]);

  function showToast(msg){
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(()=> setToast(''), 1800);
  }

  function handleSave(finalData){
    setAudits(prev => {
      const idx = prev.findIndex(a => a.id === finalData.id);
      if(idx >= 0){
        const next = [...prev];
        next[idx] = finalData;
        return next;
      }
      return [...prev, finalData];
    });
    setDrawerAudit(undefined);
  }

  function handleDelete(id){
    if(confirm('Delete this audit record? This cannot be undone.')){
      setAudits(prev => prev.filter(a => a.id !== id));
    }
  }

  async function handleCopyCurrent(audit){
    const ok = await copyToClipboard(buildCurrentStatusText(audit));
    showToast(ok ? 'Current status copied' : 'Copy failed — select and copy manually');
  }

  async function handleCopyFull(audit){
    const ok = await copyToClipboard(buildFullStatusText(audit));
    showToast(ok ? 'Full status copied' : 'Copy failed — select and copy manually');
  }

  const q = search.trim().toLowerCase();
  const filtered = audits.filter(a=>{
    if(!q) return true;
    return [a.siteName,a.indusId,a.qeName,a.district,a.zone].some(v => (v||'').toLowerCase().includes(q));
  });

  return h(React.Fragment, null,
    h('header', null,
      h('div', {className:'brand'},
        h('div', {className:'brand-mark'}),
        h('div', null,
          h('div', {className:'eyebrow'}, 'Field Quality · Electrical'),
          h('h1', null, 'Site Audit Panel')
        )
      ),
      h('div', {className:'toolbar'},
        h('input', {type:'text', id:'searchInput', placeholder:'Search site, Indus ID, QE...', value:search, onChange:e=>setSearch(e.target.value)}),
        h('button', {className:'btn primary', onClick:()=>setDrawerAudit(null)}, '+ New Audit')
      )
    ),
    h('main', null,
      h(StatsRow, {audits:audits}),
      h('div', {className:'table-wrap'},
        filtered.length > 0
          ? h('table', null,
              h('thead', null,
                h('tr', null,
                  h('th', null, 'Status'),
                  h('th', null, 'Site'),
                  h('th', null, 'District / Zone'),
                  h('th', null, 'Audit Date'),
                  h('th', null, 'QE'),
                  h('th', null, 'Checks'),
                  h('th', null, 'Punch Points'),
                  h('th', null, '')
                )
              ),
              h('tbody', null,
                filtered.map(a => h(AuditRow, {
                  key:a.id, audit:a,
                  onOpen: ()=>setDrawerAudit(a),
                  onDelete: ()=>handleDelete(a.id),
                  onCopyCurrent: ()=>handleCopyCurrent(a),
                  onCopyFull: ()=>handleCopyFull(a),
                }))
              )
            )
          : h('div', {className:'empty-state'},
              h('div', {className:'big'}, '◌'),
              'No audits logged yet. Click "New Audit" to add the first site record.'
            )
      )
    ),
    drawerAudit !== undefined && h(AuditDrawer, {
      audit: drawerAudit,
      onClose: ()=>setDrawerAudit(undefined),
      onSave: handleSave,
    }),
    h('div', {className:'toast' + (toast ? ' show' : '')}, toast)
  );
}

try{
  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
}catch(err){
  console.error('Site Audit Panel failed to start:', err);
  document.getElementById('root').innerHTML =
    '<div style="padding:40px;font-family:monospace;color:#ef5959;max-width:640px;margin:0 auto;">' +
    '<h2 style="margin-top:0;">Something went wrong</h2>' +
    '<p>The app hit an error while starting up. Details below — press F12 (or right-click → Inspect) to see the full console log.</p>' +
    '<pre style="white-space:pre-wrap;background:#1b2129;padding:12px;border-radius:6px;border:1px solid #2c3540;">' +
    (err && err.message ? err.message : String(err)) +
    '</pre></div>';
}
