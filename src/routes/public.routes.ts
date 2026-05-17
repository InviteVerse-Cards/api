import { Router } from 'express'
import { PublicController } from '@/controllers/public.controller'
import { apiRateLimit } from '@/middleware/rateLimit'

const router = Router()

// No auth — public endpoints
router.get('/templates/:slug', PublicController.getTemplateDemo)
router.get('/invitations/:slug', PublicController.getInvitation)
router.get('/music-tracks', PublicController.getMusicTracks)
router.get('/music/default', PublicController.getDefaultMusicTrack)
router.post('/invitations/:slug/rsvp', apiRateLimit, PublicController.submitRSVP)

export default router
