import mongoose from 'mongoose';

const { Schema } = mongoose;

const chatMessageSchema = new Schema(
  {
    rescueId: {
      type: Schema.Types.ObjectId,
      ref: 'RescueRequest',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'location', 'system'],
      default: 'text',
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    metadata: {
      imageUrl: String,
      location: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: [Number],
      },
    },
    readAt: {
      type: Date,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    deletedBySender: {
      type: Boolean,
      default: false,
    },
    deletedByReceiver: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
chatMessageSchema.index({ rescueId: 1, createdAt: 1 });
chatMessageSchema.index({ senderId: 1, receiverId: 1 });
chatMessageSchema.index({ receiverId: 1, isRead: 1 });

// Virtuals
chatMessageSchema.virtual('sender', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true,
});

chatMessageSchema.virtual('receiver', {
  ref: 'User',
  localField: 'receiverId',
  foreignField: '_id',
  justOne: true,
});

chatMessageSchema.virtual('rescue', {
  ref: 'RescueRequest',
  localField: 'rescueId',
  foreignField: '_id',
  justOne: true,
});

// Instance methods
chatMessageSchema.methods.markAsRead = function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return this;
};

// Static methods
chatMessageSchema.statics.findByRescue = function (rescueId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  return this.find({ rescueId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId receiverId', 'firstName lastName avatar');
};

chatMessageSchema.statics.findConversation = function (userId1, userId2, rescueId) {
  return this.find({
    rescueId,
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 },
    ],
  })
    .sort({ createdAt: 1 })
    .populate('senderId receiverId', 'firstName lastName avatar');
};

chatMessageSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    receiverId: userId,
    isRead: false,
  });
};

chatMessageSchema.statics.markAllAsRead = function (rescueId, userId) {
  return this.updateMany(
    {
      rescueId,
      receiverId: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );
};

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;
