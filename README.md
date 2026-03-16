# LiftCare OS MVP

MVP frontend for a GMAO/SAV application focused on aftersales service operations.

## Current scope

- Service dashboard with SLA and workload indicators
- Work order view with filtering and intervention details
- Installed base view for monitored equipment
- Contract view for coverage, renewal, and revenue tracking
- Mock domain data for technicians, interventions, assets, contracts, and spare parts alerts

## Stack

- React 19
- TypeScript
- Vite

## Run locally

```powershell
Set-Location 'e:\Lift\gmao-sav'
npm.cmd install
npm.cmd run dev
```

## Production build

```powershell
Set-Location 'e:\Lift\gmao-sav'
npm.cmd run build
```

The build generates the production bundle in `dist`.

## Next implementation steps

1. Replace mock data with a typed API layer.
2. Add authentication and role-based access for dispatcher, technician, and manager profiles.
3. Implement creation and status transitions for work orders.
4. Connect contracts, SLA rules, and preventive maintenance plans to a backend data model.
5. Align the UI and workflows with the documents from the extracted zip.
