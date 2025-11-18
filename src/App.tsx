


import { useState, useRef, useEffect } from 'react'
import fraud from "../src/assets/fraud.jpeg"
import image1 from "../src/assets/ai.jpeg"
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
    RadarChart, PolarGrid, PolarAngleAxis, Radar,
    RadialBarChart, RadialBar,
} from 'recharts'

// File: App.tsx — function App()
const App = () => {
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<string | null>(null)
    const [resultJson, setResultJson] = useState<any | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const mainRef = useRef<HTMLDivElement>(null)

    const [contactOpen, setContactOpen] = useState(false)
    const [contactName, setContactName] = useState('')
    const [contactMessage, setContactMessage] = useState('')
    const [contactSending, setContactSending] = useState(false)
    const [contactError, setContactError] = useState<string | null>(null)

    const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || ''
    const endpoint = apiBase ? `${apiBase}/api/analyze` : `/api/analyze`
    const feedbackEndpoint = apiBase ? `${apiBase}/api/feedback` : `/api/feedback`

    // NEW: helpers + derived datasets for multi-ring donut
    const palette = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#22c55e', '#06b6d4', '#f97316']
    const toPct = (x: number | undefined | null) =>
        Math.max(0, Math.min(100, Math.round(((x ?? 0) as number) * 100)))



    const localData =
        [
            { name: 'Frequency', value: toPct(resultJson?.local?.frequency) },
            { name: 'Noise', value: toPct(resultJson?.local?.noise) },
            { name: 'Compression', value: toPct(resultJson?.local?.compression) },
            { name: 'Color Corr', value: toPct(resultJson?.local?.color_corr) },
        ].filter(d => d.value > 0)

    const breakdownMetrics: string[] = resultJson?.breakdown?.metrics ?? []
    const breakdownScores: number[] = resultJson?.breakdown?.scores ?? []
    const breakdownData =
        breakdownMetrics.map((name, i) => ({
            name,
            value: Math.max(0, Math.min(100, Math.round((breakdownScores[i] ?? 0)))),
        })).filter(d => d.value > 0)

    const toPercent = (x: number | undefined | null) => {
        const n = Number(x ?? 0)
        return Math.max(0, Math.min(100, Math.round(n <= 1 ? n * 100 : n)))
    }






    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0]
            return (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ color: '#64748b' }}>{Math.round(item.value)}%</div>
                </div>
            )
        }
        return null
    }

    const toScore = (x: number | undefined | null) => {
        const n = (x ?? 0) as number
        return n <= 1 ? Math.round(n * 100) : Math.round(n)
    }

    const hybridData = [
        { name: 'API AI', value: toScore(resultJson?.hybrid?.api_ai_score), fill: '#6366f1' },
        { name: 'Forensic AI %', value: Math.round(resultJson?.hybrid?.forensic_ai_pct ?? 0), fill: '#f59e0b' },
        { name: 'Metadata Adjust', value: Math.round(resultJson?.hybrid?.metadata_adjustment ?? 0), fill: '#8b5cf6' },
        { name: 'Final AI Score', value: Math.round(resultJson?.hybrid?.final_ai_score ?? 0), fill: '#ef4444' },
    ].filter(d => d.value > 0)

    const exifPresent = !!(resultJson?.metadata?.exif_present)
    const imgSize = `${resultJson?.local?.width ?? '-'}×${resultJson?.local?.height ?? '-'}`
    const operations = resultJson?.sightengine?.request?.operations ?? 0

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] ?? null
        setFile(selected)
        setResult(null)
        setError(null)
        if (selected) {
            const url = URL.createObjectURL(selected)
            setPreviewUrl(url)
        } else {
            setPreviewUrl(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const form = new FormData()
            form.append('file', file)

            const res = await fetch(endpoint, {
                method: 'POST',
                body: form,
            })

            if (!res.ok) {
                const msg = await res.text().catch(() => 'Request failed')
                throw new Error(msg || `HTTP ${res.status}`)
            }

            // Try JSON first; fall back to text
            const contentType = res.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
                const data = await res.json()
                setResultJson(data)
                setResult(JSON.stringify(data, null, 2))
            } else {
                const text = await res.text()
                setResultJson(null)
                setResult(text)
            }
        } catch (err: any) {
            setError(err?.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const dropped = e.dataTransfer.files?.[0] ?? null
        setFile(dropped)
        setResult(null)
        setError(null)
        if (dropped) {
            const url = URL.createObjectURL(dropped)
            setPreviewUrl(url)
        } else {
            setPreviewUrl(null)
        }
    }

    const openFileDialog = () => {
        inputRef.current?.click()
    }

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (contactSending) return
        setContactError(null)
        setContactSending(true)
        try {
            const res = await fetch(feedbackEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: 'bolapereira57@gmail.com',
                    name: contactName,
                    message: contactMessage,
                }),
            })
            if (!res.ok) {
                const msg = await res.text().catch(() => 'Failed to send')
                throw new Error(msg || `HTTP ${res.status}`)
            }
            setContactOpen(false)
            setContactName('')
            setContactMessage('')
        } catch (err: any) {
            setContactError(err?.message || 'Failed to send')
        } finally {
            setContactSending(false)
        }
    }

    // FUTURISTIC HUD: progress + phases
    const [scanProgress, setScanProgress] = useState(0)
    const [phaseIndex, setPhaseIndex] = useState(0)
    const phaseLabels = [
        'Initializing System',
        'Calibrating Signals',
        'Extracting Features',
        'Synthesizing Patterns',
        'Running Inference',
        'Aggregating Metrics',
        'Finalizing Report',
    ]
    const rafId = useRef<number | null>(null)
    const targetRef = useRef<number>(92)
    const thresholds = [0, 12, 28, 46, 64, 82, 95]

    useEffect(() => {
        if (!loading) {
            if (rafId.current) cancelAnimationFrame(rafId.current)
            setScanProgress(100)
            setPhaseIndex(phaseLabels.length - 1)
            return
        }
        setScanProgress(0)
        setPhaseIndex(0)
        targetRef.current = 92

        const tick = () => {
            setScanProgress(prev => {
                const target = targetRef.current
                const delta = Math.max(0.6, (target - prev) * 0.06)
                const next = Math.min(target, prev + delta)
                const idx = thresholds.findIndex((t, i) => next >= t && next < (thresholds[i + 1] ?? 101))
                if (idx !== -1) setPhaseIndex(idx)
                return next
            })
            rafId.current = requestAnimationFrame(tick)
        }
        rafId.current = requestAnimationFrame(tick)
        return () => {
            if (rafId.current) cancelAnimationFrame(rafId.current)
        }
    }, [loading])

    return (
        <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 mt-10">
            <div className='flex m-3 justify-between items-center flex-wrap gap-4 mb-10'>
                <div className="inline-flex items-center gap-2">
                    <span className="text-3xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">Proof</span>
                    <svg className="h-6 w-6 -mx-1 text-blue-600 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M13 3 L4 14 H11 L9 21 L20 10 H13 L15 3 Z" />
                    </svg>
                    <span className="text-3xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">pulse</span>
                </div>
                <div className='flex justify-between gap-6 sm:gap-10'>

                    <h3 className='cursor-pointer hover:opacity-75' onClick={() => setContactOpen(true)}>Contact</h3>
                </div>
            </div>

            <div className="grid pt-10 sm:pt-16 gap-8" ref={mainRef}>
                <div className='flex flex-col md:flex-row flex-col-reverse items-start gap-8 col-span-2 '>
                    <section className="space-y-4 w-full md:w-1/2 md:pr-6">
                        <h1 className="text-3xl sm:text-4xl md:text-[3.4rem] font-extrabold leading-tight text-slate-900 max-w-2xl">
                            Detect <span className='text-[#007AFF]'>AI-Generated Images</span> instantly
                        </h1>
                        <p className="mt-6 sm:mt-8 text-base sm:text-[1.2rem] text-slate-600 max-w-xl">
                            ProofPulse is a powerful image-analysis tool built to detect AI-generated visuals with precision. Upload any image and receive a clear, detailed forensic report in seconds. <span className='font-bold'> Try ProofPulse and see the truth behind every pixel.</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                            <div className="rounded-xl backdrop-blur w-full sm:w-[80%]  py-5">
                                <div className="text-4xl font-extrabold tracking-tight text-[#007AFF]">35M+</div>
                                <div className="mt-2 text-sm text-slate-600 " >The amount of ai-generated images created per day</div>
                            </div>
                            <div className="rounded-xl py-5 w-full sm:w-[80%] ">
                                <div className="text-4xl font-extrabold tracking-tight text-[#007AFF]">15B+</div>
                                <div className="mt-2 text-sm text-slate-600">And counting: the number of AI-generated photos online.e</div>
                            </div>
                        </div>
                    </section>
                    <form className="left w-full md:w-1/2 space-y-4 mt-8 md:mt-0" onSubmit={handleSubmit}>
                        <div
                            className={`dropzone ${isDragging ? 'dragover' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={openFileDialog}
                            role="button"
                            aria-label="Drag or select image"
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="h-[220px] sm:h-[280px] max-w-full object-contain mx-auto" />
                            ) : (
                                <div className="dz-content">
                                    <div className="dz-icon">🖼️</div>
                                    <p className="dz-title">Drag or select image</p>
                                    <p className="dz-subtitle">
                                        supported formats: png, jpg, jpeg, webp, bmp
                                    </p>
                                </div>
                            )}

                            {loading && (
                                <FuturisticHUD
                                    progress={scanProgress}
                                    phase={phaseIndex}
                                    labels={phaseLabels}
                                />
                            )}
                        </div>

                        <input
                            ref={inputRef}
                            id="image-input"
                            type="file"
                            accept="image/*"
                            className="hidden-file-input"
                            onChange={handleFileChange}
                        />

                        <button className="w-full rounded-full bg-blue-600 text-white px-4 py-3 shadow-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed mt-4" type="submit" disabled={!file || loading}>
                            {loading ? 'Analyzing…' : 'Analyze Image'}
                        </button>
                    </form>
                </div>
                {
                    resultJson && (
                        <div className="space-y-6 col-span-2 ">
                            <div className='text-center text-xl sm:text-2xl my-10 sm:my-20'>Analysis Result</div>
                            <div className="verdict-header">
                                <span className="verdict-label text-2xl font-semibold text-slate-700">Verdict</span>
                                <span className={`verdict-text ${(resultJson.hybrid?.final_ai_score ?? 0) >= 70 ? 'ai bg-red-50 text-red-700 ring-1 ring-red-200' : 'human bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'} px-2.5 py-1 rounded-full text-xs font-medium`}>
                                    {(resultJson.hybrid?.final_ai_score ?? 0) >= 70 ? 'Likely AI-generated' : 'Likely human-made'}
                                </span>
                            </div>
                            <div className='h-[300px]'>
                                <div className="donut-wrap relative rounded-xl">
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'AI', value: Math.round((resultJson.sightengine?.type?.ai_generated ?? 0) * 100) },
                                                    { name: 'Human', value: 100 - Math.round((resultJson.sightengine?.type?.ai_generated ?? 0) * 100) },
                                                ]}
                                                dataKey="value"
                                                innerRadius={50}
                                                outerRadius={70}
                                            >
                                                <Cell fill="#ef4444" />
                                                <Cell fill="#10b981" />
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="donut-center absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <div className="donut-score text-2xl font-extrabold text-slate-900">{Math.round((resultJson.sightengine?.type?.ai_generated ?? 0) * 100)}<span className="donut-pct text-sm font-semibold text-slate-500">%</span></div>
                                        <div className="donut-label text-xs uppercase tracking-wide text-slate-500">AI</div>
                                    </div>
                                </div>
                            </div>
                            <div className="verdict-details mt-20 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white/60 backdrop-blur p-4 text-sm">
                                <div>Final AI score: <b>{(resultJson.hybrid?.final_ai_score ?? 0).toFixed(2)}</b></div>
                                <div>Forensic score: <b>{(resultJson.local?.forensic_score ?? 0).toFixed(3)}</b></div>
                            </div>
                            <div className="analytics space-y-6">
                                <div className="cards grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="card rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                                        <div className="label text-xs font-medium text-slate-500">Image Size</div>
                                        <div className="value mt-1 text-sm font-semibold text-slate-900">{imgSize}</div>
                                    </div>
                                    <div className="card rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                                        <div className="label text-xs font-medium text-slate-500">Sightengine Ops</div>
                                        <div className="value mt-1 text-sm font-semibold text-slate-900">{operations}</div>
                                    </div>
                                    <div className="card rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                                        <div className="label text-xs font-medium text-slate-500">EXIF Present</div>
                                        <div className="value mt-1 text-sm font-semibold text-slate-900">{exifPresent ? 'Yes' : 'No'}</div>
                                    </div>
                                </div>

                                {/* Breakdown Scores (bar chart) */}
                                <div className="chart-wrap rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                                    <h4 className="mb-2 text-[13px] font-medium text-slate-500">Breakdown Scores</h4>
                                    <ResponsiveContainer width="100%" height={460}>
                                        <BarChart data={breakdownData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar dataKey="value" fill="#6366f1" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="chart-wrap rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                                    <h4 className="mb-2 text-[13px] font-medium text-slate-500">Local Forensics</h4>
                                    <ResponsiveContainer width="100%" height={460}>
                                        <RadarChart data={localData}>
                                            <PolarGrid />
                                            <PolarAngleAxis dataKey="name" />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Radar dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Hybrid Summary (radial bar chart) */}
                                <div className="chart-wrap rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                                    <h4 className="mb-2 text-[13px] font-medium text-slate-500">Hybrid Summary</h4>
                                    <ResponsiveContainer width="100%" height={460}>
                                        <RadialBarChart innerRadius="20%" outerRadius="90%" data={hybridData}>
                                            <RadialBar dataKey="value" clockWise background />
                                            <Legend />
                                            <Tooltip content={<CustomTooltip />} />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="response-panel space-y-4">
                                <div className="rp-title text-sm font-semibold text-slate-700">Analysis Summary</div>
                                <div className="rp-cards grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="rp-card rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm">
                                        <div className="rp-label text-xs text-slate-500">AI generated</div>
                                        <div className="rp-value mt-1 text-sm font-semibold text-slate-900">{toPercent(resultJson?.sightengine?.type?.ai_generated)}%</div>
                                    </div>
                                    <div className="rp-card rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm">
                                        <div className="rp-label text-xs text-slate-500">Final AI score</div>
                                        <div className="rp-value mt-1 text-sm font-semibold text-slate-900">{toPercent(resultJson?.hybrid?.final_ai_score)}%</div>
                                    </div>
                                    <div className="rp-card rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm">
                                        <div className="rp-label text-xs text-slate-500">Forensic AI %</div>
                                        <div className="rp-value mt-1 text-sm font-semibold text-slate-900">{toPercent(resultJson?.hybrid?.forensic_ai_pct)}%</div>
                                    </div>
                                    <div className="rp-card rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm">
                                        <div className="rp-label text-xs text-slate-500">Metadata adjustment</div>
                                        <div className="rp-value mt-1 text-sm font-semibold text-slate-900">{toPercent(resultJson?.hybrid?.metadata_adjustment)}%</div>
                                    </div>
                                    <div className="rp-card rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm">
                                        <div className="rp-label text-xs text-slate-500">Sightengine ops</div>
                                        <div className="rp-value mt-1 text-sm font-semibold text-slate-900">{resultJson?.sightengine?.request?.operations ?? 0}</div>
                                    </div>
                                    <div className="rp-card rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm">
                                        <div className="rp-label text-xs text-slate-500">Image size</div>
                                        <div className="rp-value mt-1 text-sm font-semibold text-slate-900">
                                            {(resultJson?.local?.width ?? '-')}×{(resultJson?.local?.height ?? '-')}
                                        </div>
                                    </div>
                                </div>

                                <div className="rp-title mt-3 text-sm font-semibold text-slate-700">Breakdown</div>
                                <div className="rp-bars space-y-2">
                                    {(resultJson?.breakdown?.metrics ?? []).map((name: string, i: number) => (
                                        <BarRow
                                            key={`${name}-${i}`}
                                            name={name === 'Color' ? 'Color correction' : name}
                                            value={toPercent(resultJson?.breakdown?.scores?.[i])}
                                            color={palette[i % palette.length]}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                }
                {error && <div className="error">{error}</div>}
                {result && (
                    <div className="result"><pre>{result}</pre></div>
                )}
                <section className="col-span-2 mt-16 sm:mt-26 flex flex-col gap-10 sm:gap-20">
                    <div className="text-center space-y-3">
                        <h2 className="text-3xl md:text-5xl font-extrabold max-w-[60%] leading-15 mx-auto text-slate-900">
                            The Hidden Risks Behind Generated Images
                        </h2>
                        <p className="text-slate-600 w-[50%] mx-auto mt-10 text-xl">
                            AI-generated images keep getting more convincing and unfortunately, they’re also being misused in harmful ways. Here’s how:
                        </p>
                    </div>

                    <div className="mt-12 sm:mt-20 flex flex-col md:flex-row items-center justify-between gap-8 sm:gap-20 ">
                        <div className="rounded-2xl h-[240px] md:h-[400px] w-full md:w-[80%] flex gap-8 sm:gap-20 overflow-hidden shadow-sm bg-white/70 backdrop-blur border border-slate-200">
                            <img className="w-full h-auto rounded-2xl object-cover" src={image1} alt="Example manipulated portrait" />

                        </div>
                        <div className="space-y-2 w-full md:w-[80%]">
                            <h3 className="text-2xl sm:text-4xl md:text-5xl leading-15 font-bold text-slate-900">Fake News and Propaganda</h3>
                            <p className="text-slate-600 w-full md:w-[80%] text-base sm:text-[1.2rem] mt-4">
                                AI can fabricate realistic scenes of people saying or doing things they never did. This spreads misinformation, sows discord, and manipulates public opinion.
                            </p>
                        </div>

                    </div>

                    <div className="mt-12 sm:mt-20 flex flex-col md:flex-row justify-between items-center gap-8 sm:gap-16 lg:gap-24 ">
                        <div className="space-y-2 w-full md:w-[80%]">
                            <h3 className="text-2xl sm:text-4xl md:text-5xl leading-15 font-bold text-slate-900">Image Theft and Copyright Violations</h3>
                            <p className="text-slate-600 w-full md:w-[90%] text-base sm:text-[1.2rem] mt-4">
                                AI can produce images that closely mimic copyrighted work, which can undermine artists’ livelihoods and make it harder for them to protect their creative rights.
                            </p>
                        </div>
                        <div className="rounded-2xl h-[240px] md:h-[400px] w-full md:w-[80%] flex gap-8 sm:gap-20 overflow-hidden shadow-sm bg-white/70 backdrop-blur border border-slate-200">
                            <img className="w-full h-auto rounded-2xl object-cover" src="https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1600&auto=format&fit=crop" alt="Example manipulated portrait" />
                        </div>
                    </div>


                    <div className="mt-12 sm:mt-20 flex flex-col md:flex-row justify-between items-center gap-8 sm:gap-16 lg:gap-24 ">
                        <div className="rounded-2xl h-[240px] md:h-[400px] w-full md:w-[80%] flex gap-8 sm:gap-20 overflow-hidden shadow-sm bg-white/70 backdrop-blur border border-slate-200">
                            <img className="w-full h-auto rounded-2xl object-cover" src={fraud} alt="Example manipulated portrait" />
                        </div>
                        <div className="space-y-2 w-full md:w-[80%]">
                            <h3 className="text-2xl sm:text-4xl md:text-5xl leading-15 font-bold text-slate-900">Identity Fraud</h3>
                            <p className="text-slate-600 w-full md:w-[90%] text-base sm:text-[1.2rem] mt-4">
                               AI-generated images can be used to forge identification documents, enabling identity theft, bypassing KYC verification on crypto platforms, and supporting various other forms of fraud.
                            </p>
                        </div>
                    </div>

                </section>

                <section className="col-span-2 mt-40">
                    <div className="text-center space-y-3">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900">
                            Clear Answers to few <span className="text-[#007AFF]"> Questions </span>
                        </h2>
                    </div>
                    <div className="mt-18 space-y-4 max-w-3xl mx-auto px-4">
                        <details className="rounded-2xl bg-white/80 shadow-md p-5">
                            <summary className="flex cursor-pointer items-center justify-between gap-4">
                                <span className="text-slate-900 text-[1.2rem] font-semibold">What is Proofpulse and how does it work?</span>
                                <span className="flex h-8 w-8 items-center justify-center border-blue-400 rounded-lg border text-blue-400 text-[1.2rem] transition-transform open:rotate-45">+</span>
                            </summary>
                            <div className="mt-3 text-slate-600">Upload an image and we run forensic and model analysis to estimate whether it was AI-generated and why.</div>
                        </details>
                        <details className="rounded-2xl bg-white/80 shadow-md p-4">
                            <summary className="flex cursor-pointer items-center justify-between gap-4">
                                <span className="text-slate-900 text-[1.2rem] font-semibold">How do I use Proofpulse?</span>
                                <span className="flex h-8 w-8 items-center justify-center border-blue-400 rounded-lg border text-blue-400 text-[1.2rem] transition-transform open:rotate-45">+</span>
                            </summary>
                            <div className="mt-3 text-slate-600">Drag an image into the dropzone or select a file, then click Analyze to see the report.</div>
                        </details>
                        <details className="rounded-2xl bg-white/80 shadow-md p-4">
                            <summary className="flex cursor-pointer items-center justify-between gap-4">
                                <span className="text-slate-900 text-[1.2rem] font-semibold">Can I use Proofpulse on mobile devices?</span>
                                <span className="flex h-8 w-8 items-center justify-center border-blue-400 rounded-lg border text-blue-400 text-[1.2rem] transition-transform open:rotate-45">+</span>
                            </summary>
                            <div className="mt-3 text-slate-600">Yes, the interface is responsive and works on modern mobile browsers.</div>
                        </details>
                        <details className="rounded-2xl bg-white/80 shadow-md p-4">
                            <summary className="flex cursor-pointer items-center justify-between gap-4">
                                <span className="text-slate-900 text-[1.2rem] font-semibold">Are there any limitations to the types of images I can analyze?</span>
                                <span className="flex h-8 w-8 items-center justify-center border-blue-400 rounded-lg border text-blue-400 text-[1.2rem] transition-transform open:rotate-45">+</span>
                            </summary>
                            <div className="mt-3 text-slate-600">Common formats like PNG, JPG/JPEG, WEBP, and BMP are supported. Very large files may be slower.</div>
                        </details>
                        <details className="rounded-2xl bg-white/80 shadow-md p-4">
                            <summary className="flex cursor-pointer items-center justify-between gap-4">
                                <span className="text-slate-900 text-[1.2rem] font-semibold">Does Proofpulse store the images I upload for analysis?</span>
                                <span className="flex h-8 w-8 items-center justify-center border-blue-400 rounded-lg border text-blue-400 text-[1.2rem] transition-transform open:rotate-45">+</span>
                            </summary>
                            <div className="mt-3 text-slate-600">ProofPulse never stores images on local devices. All processing and analysis are performed securely on the backend, ensuring no persistent image data is retained.</div>
                        </details>
                    </div>
                </section>

            </div>
            <footer className="text-center text-gray-500 mt-20 my-2">Built with love by Josh  © 2025 </footer>

            {contactOpen && (
                <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-[90%] max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Send Feedback</h3>
                            <button type="button" className="rounded-md p-2 text-slate-500 hover:text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => setContactOpen(false)} aria-label="Close">×</button>
                        </div>
                        <form onSubmit={handleContactSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="contact-to" className="block text-sm font-medium text-slate-700">To</label>
                                <input id="contact-to" type="email" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-slate-100 text-slate-700" value="bolapereira57@gmail.com" readOnly />
                            </div>
                            <div>
                                <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700">Name</label>
                                <input id="contact-name" type="text" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700">Message</label>
                                <textarea id="contact-message" rows={5} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} />
                            </div>
                            {contactError && <div className="text-sm text-red-600">{contactError}</div>}
                            <div className="flex justify-end gap-3">
                                <button type="button" className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100" onClick={() => setContactOpen(false)}>Cancel</button>
                                <button type="submit" className="rounded-full bg-blue-600 text-white px-4 py-2 hover:brightness-110 disabled:opacity-50" disabled={!contactMessage || contactSending}>{contactSending ? 'Sending…' : 'Send'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

const FuturisticHUD = ({
    progress,
    phase,
    labels,
}: {
    progress: number
    phase: number
    labels: string[]
}) => {
    const R = 96
    const C = 2 * Math.PI * R

    return (
        <div className="hud-overlay" aria-hidden="true">
            <div className="hud-grid" />
            <div className="hud-scan-line" />
            <div className="hud-ring">
                <svg width="220" height="220" viewBox="0 0 220 220">
                    <defs>
                        <linearGradient id="neonGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#00D1FF" />
                            <stop offset="50%" stopColor="#007AFF" />
                            <stop offset="100%" stopColor="#60A5FA" />
                        </linearGradient>
                    </defs>
                    <circle className="bg" cx="110" cy="110" r={R} fill="none" />
                    <circle
                        className="fg"
                        cx="110"
                        cy="110"
                        r={R}
                        fill="none"
                        strokeDasharray={C}
                        strokeDashoffset={Math.max(0, C - (C * Math.min(100, Math.max(0, progress))) / 100)}
                    />
                </svg>
                <div className="hud-ring-core">
                    <div className="hud-percent">{Math.round(progress)}%</div>
                    <div className="hud-phase">{labels[phase] ?? 'Analyzing'}</div>
                </div>
            </div>

            <div className="hud-legend">
                {labels.map((label, i) => (
                    <div key={label} className={`phase-item ${i <= phase ? 'active' : ''}`}>
                        <span className="dot" />
                        <span className="text">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default App



function BarRow({ name, value, color }: { name: string; value: number; color?: string }) {
    const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)))
    const fill = color ?? '#cbd5e1'
    return (
        <div className="bar-row" role="group" aria-label={`${name} ${pct}%`}>
            <div className="bar-name">{name}</div>
            <div className="bar-track">
                <div
                    className="bar-fill"
                    style={{
                        width: `${pct}%`,
                        background: fill,
                    }}
                />
            </div>
            <div className="bar-value">{pct}%</div>
        </div>
    )
}
