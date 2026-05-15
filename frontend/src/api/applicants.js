import client from './client'

const applicantsAPI = {
  getMe: () => client.get('/applicants/me'),
}

export default applicantsAPI