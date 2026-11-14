import { useOutletContext } from 'react-router-dom'
import GenerateView from '../../components/GenerateView'

export default function TeacherGenerate() {
  const { collections } = useOutletContext()
  return <GenerateView collections={collections} />
}
