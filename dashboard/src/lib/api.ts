import ky from 'ky'

const api = ky.create({
  prefixUrl: '/api',
  timeout: 30000,
})

export default api
