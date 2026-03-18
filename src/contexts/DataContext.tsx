import { createContext, useContext, useEffect, useState } from 'react'
import type {
  LiftUnit, WorkOrder, Technician, GammeAssemblage,
  RetrofitOperation, PartAlert, FNC,
} from '../data'
import { ApiService } from '../services/api'

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
  const [liftUnits, setLiftUnits] = useState<LiftUnit[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [gammes, setGammes] = useState<GammeAssemblage[]>([])
  const [retrofitOperations, setRetrofitOps] = useState<RetrofitOperation[]>([])
  const [partsAlerts, setPartsAlerts] = useState<PartAlert[]>([])
  const [fncs, setFncs] = useState<FNC[]>([])
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
      console.error('[DataProvider] API indisponible:', err)
      setError('API indisponible — veuillez réessayer')
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
