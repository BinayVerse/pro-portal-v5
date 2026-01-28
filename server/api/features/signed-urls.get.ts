import { defineEventHandler, setResponseStatus } from 'h3'
import jwt from 'jsonwebtoken'
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { CustomError } from '../../utils/custom.error'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const bucketName = config.featuresAwsBucketName
  const region = config.awsRegion

  if (!bucketName) {
    setResponseStatus(event, 500)
    throw new CustomError('AWS bucket not configured', 500)
  }

  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  })

  const videos = [
  {
    id: 'onboarding',
    title: 'Onboarding & Subscription',
    key: 'Onboarding&Subscription.mp4',
  },
  {
    id: 'artifact',
    title: 'Artifact & User Management',
    key: 'Artifact&UserManagement.mp4',
  },
  {
    id: 'channel',
    title: 'Channel Connection & Communication',
    key: 'ChannelConnection&Communication.mp4',
  },
  {
    id: 'analytics',
    title: 'Analytics & Dashboard',
    key: 'Analytics&Dashboard.mp4',
  },
]


  const expiresIn = 3600 // 1 hour
  const result = []

  for (const video of videos) {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: video.key,
      })
    )

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: video.key,
        ResponseContentType: 'video/mp4',
        ResponseContentDisposition: 'inline',
      }),
      { expiresIn }
    )

    result.push({ ...video, url, expiresIn })
  } catch (err) {
    console.warn(`Skipping missing video: ${video.key}`)
  }
}


  setResponseStatus(event, 200)
  return { status: 'success', videos: result }
})