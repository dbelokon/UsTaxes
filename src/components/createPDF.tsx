import { FormEvent, ReactElement, useState } from 'react'
import { usePager } from './pager'
import Alert from '@material-ui/lab/Alert'
import { makeStyles } from '@material-ui/core/styles'
import log from 'ustaxes/log'
import { useSelector } from 'react-redux'
import { Information, State, TaxesState, TaxYear } from 'ustaxes/redux/data'
import { createPDFPopup } from 'ustaxes/irsForms'
import {
  canCreateFederalReturn,
  createStatePDF,
  createStateReturn,
  stateForm
} from '../stateForms'
import { create1040 } from 'ustaxes/irsForms/Main'
import { isRight } from 'ustaxes/util'
import { savePDF } from 'ustaxes/pdfFiller/pdfHandler'
import { Box, Button } from '@material-ui/core'

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    '& > * + *': {
      marginTop: theme.spacing(2)
    }
  }
}))

export default function CreatePDF(): ReactElement {
  const [errors, updateErrors] = useState<string[]>([])
  const classes = useStyles()

  const year: TaxYear = useSelector((state: TaxesState) => state.activeYear)
  const info: Information | undefined = useSelector(
    (state: TaxesState) => state[state.activeYear]
  )
  const lastName = info?.taxPayer.primaryPerson?.lastName
  const residency: State | undefined = info?.stateResidencies[0]?.state

  const federalFileName = `${lastName}-1040.pdf`
  const stateFileName = `${lastName}-${residency}.pdf`

  const { navButtons } = usePager()

  const federalReturn = async (e: FormEvent<Element>): Promise<void> => {
    e.preventDefault()
    return await createPDFPopup(federalFileName).catch((errors: string[]) => {
      if (errors.length !== undefined && errors.length > 0) {
        updateErrors(errors)
      } else {
        log.error('unhandled exception')
        log.error(errors)
        return Promise.reject(errors)
      }
    })
  }

  const stateReturn = async (): Promise<void> => {
    if (info !== undefined) {
      const f1040Result = create1040(info)
      if (isRight(f1040Result)) {
        const stateReturn = await createStateReturn(
          info,
          f1040Result.right[0],
          year
        )
        if (stateReturn !== undefined) {
          const pdfBytes = (await createStatePDF(stateReturn)).save()
          savePDF(await pdfBytes, stateFileName)
        }
      }
    }
  }

  const canCreateFederal = canCreateFederalReturn(year)
  const canCreateState =
    canCreateFederal &&
    residency !== undefined &&
    stateForm[residency] !== undefined

  return (
    <form tabIndex={-1}>
      <h2>Print Copy to File</h2>
      <div className={classes.root}>
        {errors.map((error, i) => (
          <Alert key={i} severity="warning">
            {error}
          </Alert>
        ))}
      </div>
      {(() => {
        if (canCreateFederal) {
          return (
            <Box
              display="flex"
              justifyContent="flex-start"
              paddingTop={2}
              paddingBottom={1}
            >
              <Button
                type="button"
                onClick={federalReturn}
                variant="contained"
                color="primary"
              >
                Create Federal 1040
              </Button>
            </Box>
          )
        }
        return (
          <Alert severity="info">
            Support for federal return for {year} is not yet available.
          </Alert>
        )
      })()}
      {() => {
        if (canCreateState) {
          return (
            <Box
              display="flex"
              justifyContent="flex-start"
              paddingTop={2}
              paddingBottom={1}
            >
              <Button
                type="button"
                onClick={stateReturn}
                variant="contained"
                color="primary"
              >
                Create {residency} Return
              </Button>
            </Box>
          )
        }
        return (
          <Alert severity="info">
            Support for {residency ?? 'state'} return, year {year} not yet
            available.
          </Alert>
        )
      }}
      {navButtons}
    </form>
  )
}
