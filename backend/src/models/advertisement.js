import mongoose from 'mongoose';

const AdvertisementSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    default: null
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  ctaText: {
    type: String,
    required: false,
    default: null
  },
  ctaLink: {
    type: String,
    required: false,
    default: null
  },
  active: {
    type: Boolean,
    default: true
  }
});

export const Advertisement = mongoose.model('Advertisement', AdvertisementSchema);
