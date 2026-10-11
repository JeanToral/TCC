import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import type { DateRange } from 'react-day-picker'

import { DateRangePicker } from '../ui/date-range-picker'
import { NativeSelect } from '../ui/select'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import type { GetAssetsData } from '../../graphql/assets/types'
import type { ReportFilters as ReportFiltersState } from '../../hooks/useReportFilters'
import './ReportFilters.css'

interface ReportFiltersProps {
  readonly filters: ReportFiltersState
}

/** Ativo + período, numa linha acima de tudo o que filtram. */
export default function ReportFilters({ filters }: ReportFiltersProps) {
  const { data } = useQuery<GetAssetsData>(GET_ASSETS, { fetchPolicy: 'cache-first' })
  // Entre o 1º e o 2º clique o intervalo fica só aqui; a URL muda com ele completo.
  const [draft, setDraft] = useState<DateRange | undefined>(undefined)

  function handleRange(range: DateRange | undefined) {
    if (range?.from && range.to) {
      setDraft(undefined)
      filters.setDateRange(range)
    } else {
      setDraft(range)
    }
  }

  return (
    <div className="report-filters">
      <NativeSelect
        id="filter-asset"
        label="Ativo"
        className="report-filters__select"
        value={filters.assetId ?? ''}
        onChange={(e) => filters.setAssetId(e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">Todos os ativos</option>
        {(data?.assets ?? []).map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.tag})
          </option>
        ))}
      </NativeSelect>

      <DateRangePicker
        label="Período"
        value={draft ?? filters.dateRange}
        onSelect={handleRange}
        placeholder="Selecionar intervalo"
      />

      {!filters.isDefault && (
        <button
          type="button"
          className="report-filters__reset"
          onClick={() => {
            setDraft(undefined)
            filters.reset()
          }}
        >
          Restaurar padrão
        </button>
      )}
    </div>
  )
}
