import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // ─── Theme ────────────────────────────────────────────────
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.classList.toggle('dark', next === 'dark')
        document.documentElement.classList.toggle('light', next === 'light')
      },

      // ─── Auth ─────────────────────────────────────────────────
      authed: false,
      user: { name: 'Aditya Tripathi', role: 'Data Analytics', company: 'DataMind', email: 'aditya774tripathi@gmail.com' },
      login: () => set({ authed: true }),
      logout: () => set({ authed: false, activeSession: null, report: null, chat: [], reportStatus: 'idle' }),

      // ─── Navigation ───────────────────────────────────────────
      view: 'home',
      setView: (v) => set({ view: v }),

      // ─── Dataset / Session ────────────────────────────────────
      activeSession: null,       // Full session object from backend
      sessionHistory: [],        // List of past sessions
      setActiveSession: (s) => set({ activeSession: s, report: null, reportStatus: 'idle', chat: [] }),
      addToHistory: (s) => set(st => ({
        sessionHistory: [s, ...st.sessionHistory.filter(x => x.session_id !== s.session_id)].slice(0, 20)
      })),

      // ─── Report ───────────────────────────────────────────────
      report: null,
      reportStatus: 'idle',      // idle | generating | streaming | done | error
      reportSectionStatus: {},   // { executive: 'done', kpis: 'streaming', ... }
      selectedModel: 'llama3.2',
      availableModels: [],

      setReport: (r) => set({ report: r }),
      setReportStatus: (s) => set({ reportStatus: s }),
      setReportSection: (key, val) => set(st => ({
        report: { ...(st.report || {}), [key]: val }
      })),
      appendReportSection: (key, token) => set(st => ({
        report: { ...(st.report || {}), [key]: ((st.report || {})[key] || '') + token }
      })),
      setSectionStatus: (key, status) => set(st => ({
        reportSectionStatus: { ...st.reportSectionStatus, [key]: status }
      })),
      setSelectedModel: (m) => set({ selectedModel: m }),
      setAvailableModels: (ms) => set({ availableModels: ms }),

      // ─── Chat ─────────────────────────────────────────────────
      chat: [],
      addMessage: (m) => set(st => ({ chat: [...st.chat, m] })),
      appendToLastMessage: (token) => set(st => {
        const msgs = [...st.chat]
        if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + token }
        }
        return { chat: msgs }
      }),
      clearChat: () => set({ chat: [] }),

      // ─── UI State ─────────────────────────────────────────────
      sidebarCollapsed: false,
      toggleSidebar: () => set(st => ({ sidebarCollapsed: !st.sidebarCollapsed })),
    }),
    {
      name: 'datamind-store',
      partialize: (state) => ({
        theme: state.theme,
        user: state.user,
        authed: state.authed,
        sessionHistory: state.sessionHistory,
        selectedModel: state.selectedModel,
      }),
    }
  )
)
