import { ReactElement } from 'react'
import { Grid, List, ListItem } from '@material-ui/core'
import { useDispatch, useSelector } from 'react-redux'
import {
  getRequiredQuestions,
  QuestionTagName,
  Responses
} from 'ustaxes/data/questions'
import { LabeledCheckbox, LabeledInput } from './input'
import { TaxesState } from 'ustaxes/redux/data'
import { answerQuestion } from 'ustaxes/redux/actions'
import { FormProvider, useForm } from 'react-hook-form'
import { usePager } from './pager'

const Questions = (): ReactElement => {
  const information = useSelector((state: TaxesState) => state.information)

  const methods = useForm<Responses>({ defaultValues: information.questions })
  const { handleSubmit, watch } = methods

  const currentValues = watch()

  const { navButtons, onAdvance } = usePager()

  const questions = getRequiredQuestions({
    information: {
      ...information,
      questions: {
        ...information.questions,
        ...currentValues
      }
    }
  })

  const dispatch = useDispatch()

  const onSubmit = (responses: Responses): void => {
    // fix to remove unrequired answers:
    const qtags = questions.map((q) => q.tag)
    const unrequired = Object.keys(responses).filter(
      (rtag) => qtags.find((t) => t === (rtag as QuestionTagName)) === undefined
    )

    const newResponses = {
      ...responses,
      ...Object.fromEntries(unrequired.map((k) => [k, undefined]))
    }

    dispatch(answerQuestion(newResponses))
    onAdvance()
  }

  const page = (
    <form tabIndex={-1} onSubmit={handleSubmit(onSubmit)}>
      <h2>Informational Questions</h2>
      <p>
        Based on your prior responses, responses to these questions are
        required.
      </p>
      <Grid container spacing={2}>
        <List>
          {questions.map((q, i) => (
            <ListItem key={i}>
              {(() => {
                if (q.valueTag === 'boolean') {
                  return <LabeledCheckbox name={q.tag} label={q.text} />
                }
                return <LabeledInput name={q.tag} label={q.text} />
              })()}
            </ListItem>
          ))}
        </List>
      </Grid>
      {navButtons}
    </form>
  )

  return <FormProvider {...methods}>{page}</FormProvider>
}

export default Questions
