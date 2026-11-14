import { useOutletContext } from 'react-router-dom'
import StudentAdaptive from '../../components/StudentAdaptive'

export default function StudentPractice() {
  const { collections } = useOutletContext()
  return <StudentAdaptive collections={collections} />
}
