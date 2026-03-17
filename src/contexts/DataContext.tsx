import { createContext, useContext, useEffect, useState } from 'react'
import type {
  LiftUnit, WorkOrder, Technician, GammeAssemblage,
  RetrofitOperation, PartAlert, FNC,
} from '../data'
import { ApiService } from '../services/api'

// Fallback static data (used when API is unavailable)
import {
  liftUnits as staticLiftUnits,
  workOrders as staticWorkOrders,
  technicians as staticTechnicians,
  gammes as staticGammes,
  retrofitOperations as staticRetrofitOps,
  partsAlerts as staticPartsAlerts,
  fncs as staticFncs,
} from '../data'

interface GmaoData {
  liftUnits: LiftUnit[]
  workOrders: WorkOrder[]
  technicians: Technician[]
  gammes: GammeAssemblage[]
  retrofitOperations: RetrofitOperation[]
  partsAlerts: PartAlert[]
  fncs: FNC[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const DataContext = createContext<GmaoData | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [liftUnits, setLiftUnits] = useState<LiftUnit[]>(staticLiftUnits)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(staticWorkOrders)
  const [technicians, setTechnicians] = useState<Technician[]>(staticTechnicians)
  const [gammes, setGammes] = useState<GammeAssemblage[]>(staticGammes)
  const [retrofitOperations, setRetrofitOps] = useState<RetrofitOperation[]>(staticRetrofitOps)
  const [partsAlerts, setPartsAlerts] = useState<PartAlert[]>(staticPartsAlerts)
  const [fncs, setFncs] = useState<FNC[]>(staticFncs)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [lu, wo, tech, gam, retro, pa, fn] = await Promise.all([
        ApiService.getLiftUnits() as Promise<LiftUnit[]>,
        ApiService.getWorkOrders() as Promise<WorkOrder[]>,
        ApiService.getTechnicians() as Promise<Technician[]>,
        ApiService.getGammes() as Promise<GammeAssemblage[]>,
        ApiService.getRetrofitOperations() as Promise<RetrofitOperation[]>,
        ApiService.getPartsAlerts() as Promise<PartAlert[]>,
        ApiService.getFncs() as Promise<FNC[]>,
      ])
      setLiftUnits(lu)
      setWorkOrders(wo)
      setTechnicians(tech)
      setGammes(gam)
      setRetrofitOps(retro)
      setPartsAlerts(pa)
      setFncs(fn)
    } catch (err) {
      console.warn('[DataProvider] API indisponible, utilisation des données statiques:', err)
      setError('API indisponible — données statiques utilisées')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  return (
    <DataContext.Provider value={{
      liftUnits, workOrders, technicians, gammes,
      retrofitOperations, partsAlerts, fncs,
      isLoading, error, refresh: fetchAll,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useGmaoData(): GmaoData {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useGmaoData must be used within <DataProvider>')
  return ctx
}
