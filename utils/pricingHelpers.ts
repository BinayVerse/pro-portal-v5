export function fmtPrice(v: any, currency = 'USD') {
  if (v === 'Custom' || v === 'custom') return 'Custom'
  const n = Number(v)
  if (!isFinite(n) || n === 0) return 'Contact Sales'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
}

export function deriveFeatures(opt: any) {
  if (!opt) return []
  const out: string[] = []
  const artefacts = Number(opt.artefacts || opt.price_amount || 0)
  if (!Number.isNaN(artefacts)) {
    if (artefacts === 0) out.push('Unlimited artefacts')
    else out.push(`Up to ${artefacts} artefacts`)
  }

  const lr = Number(opt.limit_requests)
  if (!Number.isNaN(lr)) {
    if (lr === 99999 || lr >= 1000000) out.push('Unlimited AI queries')
    else out.push(`Up to ${lr.toLocaleString()} AI queries per month`)
  }

  const feats = Array.isArray(opt.features) ? opt.features.map((f: any) => String(f)) : []
  const hasSlack = feats.includes('Slack Collaboration')
  const hasWhatsApp = feats.includes('WhatsApp Collaboration')
  const hasTeams = feats.includes('Teams Collaboration')
  if (hasSlack && hasWhatsApp && hasTeams) out.push('All integrations')
  else if (hasSlack && hasWhatsApp) out.push('Basic integrations')

  if (opt.storage_limit_gb === null || opt.storage_limit_gb === undefined)
    out.push('Unlimited storage')
  else out.push(`${opt.storage_limit_gb} GB storage`)

  const users = Number(opt.users)
  if (!Number.isNaN(users) && users < 99999) out.push(`Up to ${users} Users`)

  const used = new Set(['Slack Collaboration', 'WhatsApp Collaboration', 'Teams Collaboration'])
  feats.forEach((f: any) => {
    if (!used.has(f)) out.push(f)
  })

  return out
}
