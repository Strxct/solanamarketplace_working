// models/Plot.js
import mongoose from 'mongoose';

const PlotSchema = new mongoose.Schema({
  plotId: {
    type: String,
    required: false
  },
  owner: {
    type: String,
    required: false
  },
  locationx: {
    type: String,
    required: false
  },
  locationy: {
    type: String,
    required: false
  },
  price: {
    type: Number,
    required: false
  },

  image: {
    type: String,
    default: null
  },
  title: {
    type: String,
    required: false,
    default: null
  },
  link: {
    type: String,
    required: false,
    default: null
  },
  price: {
    type: String,
    required: false,
    default: null
  },
  description: {
    type: String,
    required: false,
    default: null
  },
  listedAt: {
    type: Date,
    default: null
  },
  listed: {
    type: Boolean,
    default: false
  },
  isBundle: {
    type: Boolean,
    default: false
  },
  bundleId: {
    type: Number,
    default: null
  },

  plotIds: {
    type: [Number],
    default: []
  }
});

export const Plot = mongoose.model('Plot', PlotSchema);
