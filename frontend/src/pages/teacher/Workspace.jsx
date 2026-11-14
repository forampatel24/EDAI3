import { useOutletContext } from 'react-router-dom'
import TeacherWorkspace from '../../components/TeacherWorkspace'

export default function TeacherWorkspacePage() {
  const { myCollections } = useOutletContext()
  return <TeacherWorkspace myCollections={myCollections} />
}
