import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

type Role = 'host' | 'audience'

export async function getToken(channelName: string, uid: number, role: Role) {
  const callable = httpsCallable(functions, 'generateAgoraToken')
  const res: any = await callable({ channelName, uid, role, expirationTimeInSeconds: 3600 })
  return res.data
}