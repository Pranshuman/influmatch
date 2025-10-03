// dbHelpers.js - PostgreSQL Database Helper Functions for Influmatch
import { safeQuery, safeTransaction } from './db.js'

export const dbHelpers = {
  // User functions
  async createUser(userData, pool) {
    const { name, email, password, userType, bio, website, socialMedia } = userData
    
    const result = await safeTransaction(pool, async (client) => {
      const insertResult = await client.query(
        `INSERT INTO users (name, email, password_hash, "userType", bio, website, "socialMedia")
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [name, email, password, userType, bio || null, website || null, socialMedia || null]
      );
      return insertResult.rows[0].id;
    });
    
    return result;
  },

  async getUserByEmail(email, pool) {
    const result = await safeQuery(pool, 'SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async getUserById(id, pool) {
    const result = await safeQuery(pool, 'SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  // Listing functions
  async createListing(listingData, pool) {
    const { title, description, category, budget, deadline, requirements, deliverables, brandId } = listingData
    
    const result = await safeTransaction(pool, async (client) => {
      const insertResult = await client.query(
        `INSERT INTO listings (title, description, category, budget, deadline, requirements, deliverables, "brandId")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [title, description, category, budget, deadline, requirements, deliverables, brandId]
      );
      return insertResult.rows[0].id;
    });
    
    return result;
  },

  async getAllListings(pool) {
    const result = await safeQuery(pool, `
      SELECT l.*, u.name as brandName, u.bio as brandBio, u.website as brandWebsite
      FROM listings l
      JOIN users u ON l."brandId" = u.id
      ORDER BY l."createdAt" DESC
    `);
    return result.rows;
  },

  async getListingById(id, pool) {
    const result = await safeQuery(pool, `
      SELECT l.*, u.name as brandName, u.bio as brandBio, u.website as brandWebsite
      FROM listings l
      JOIN users u ON l."brandId" = u.id
      WHERE l.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async getListingsByBrand(brandId, pool) {
    const result = await safeQuery(pool, `
      SELECT l.*, u.name as brandName, u.bio as brandBio, u.website as brandWebsite
      FROM listings l
      JOIN users u ON l."brandId" = u.id
      WHERE l."brandId" = $1
      ORDER BY l."createdAt" DESC
    `, [brandId]);
    return result.rows;
  },

  // Proposal functions
  async createProposal(proposalData, pool) {
    const { listingId, influencerId, message, proposedBudget, timeline } = proposalData
    
    const result = await safeTransaction(pool, async (client) => {
      const insertResult = await client.query(
        `INSERT INTO proposals ("listingId", "influencerId", message, "proposedBudget", timeline)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [listingId, influencerId, message, proposedBudget, timeline]
      );
      return insertResult.rows[0].id;
    });
    
    return result;
  },

  async getProposalById(id, pool) {
    const result = await safeQuery(pool, `
      SELECT p.*, 
             u.name as influencerName, u.bio as influencerBio, u.website as influencerWebsite,
             l.title as listingTitle, l."brandId", b.name as brandName
      FROM proposals p
      JOIN users u ON p."influencerId" = u.id
      JOIN listings l ON p."listingId" = l.id
      JOIN users b ON l."brandId" = b.id
      WHERE p.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async getProposalsForListing(listingId, pool) {
    const result = await safeQuery(pool, `
      SELECT p.*, 
             u.name as influencerName, u.bio as influencerBio, u.website as influencerWebsite
      FROM proposals p
      JOIN users u ON p."influencerId" = u.id
      WHERE p."listingId" = $1
      ORDER BY p."createdAt" DESC
    `, [listingId]);
    return result.rows;
  },

  async getProposalsByInfluencer(influencerId, pool) {
    const result = await safeQuery(pool, `
      SELECT p.*, 
             l.title as listingTitle, l.description as listingDescription,
             b.name as brandName, b.bio as brandBio, b.website as brandWebsite
      FROM proposals p
      JOIN listings l ON p."listingId" = l.id
      JOIN users b ON l."brandId" = b.id
      WHERE p."influencerId" = $1
      ORDER BY p."createdAt" DESC
    `, [influencerId]);
    return result.rows;
  },

  async updateProposalStatus(proposalId, status, pool) {
    const result = await safeQuery(pool, `
      UPDATE proposals 
      SET status = $1, "updatedAt" = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [status, proposalId]);
    return result.rowCount > 0;
  },

  async updateProposal(proposalId, updateData, pool) {
    const { message, proposedBudget, timeline } = updateData
    
    const result = await safeQuery(pool, `
      UPDATE proposals 
      SET message = $1, "proposedBudget" = $2, timeline = $3, "updatedAt" = CURRENT_TIMESTAMP 
      WHERE id = $4
    `, [message, proposedBudget, timeline, proposalId]);
    return result.rowCount > 0;
  },

  // Message functions
  async createMessage(messageData, pool) {
    const { conversationId, senderId, recipientId, content } = messageData
    
    const result = await safeTransaction(pool, async (client) => {
      const insertResult = await client.query(
        `INSERT INTO messages ("conversationId", "senderId", "receiverId", content)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [conversationId, senderId, recipientId, content]
      );
      return insertResult.rows[0].id;
    });
    
    return result;
  },

  async getMessagesForConversation(conversationId, pool) {
    const result = await safeQuery(pool, `
      SELECT m.*, u.name as senderName
      FROM messages m
      JOIN users u ON m."senderId" = u.id
      WHERE m."conversationId" = $1
      ORDER BY m."createdAt" ASC
    `, [conversationId]);
    return result.rows;
  },

  // Deliverables functions
  async createDeliverable(deliverableData, pool) {
    const { proposalId, title, description, type, dueDate } = deliverableData
    
    const result = await safeTransaction(pool, async (client) => {
      const insertResult = await client.query(
        `INSERT INTO deliverables ("proposalId", title, description, type, "dueDate")
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [proposalId, title, description, type, dueDate]
      );
      return insertResult.rows[0].id;
    });
    
    return result;
  },

  async getDeliverableById(id, pool) {
    const result = await safeQuery(pool, `
      SELECT d.*, 
             p."influencerId", p."listingId",
             u.name as influencerName, u.email as influencerEmail,
             l.title as listingTitle, l."brandId",
             b.name as brandName, b.email as brandEmail
      FROM deliverables d
      JOIN proposals p ON d."proposalId" = p.id
      JOIN users u ON p."influencerId" = u.id
      JOIN listings l ON p."listingId" = l.id
      JOIN users b ON l."brandId" = b.id
      WHERE d.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async getDeliverablesByProposal(proposalId, pool) {
    const result = await safeQuery(pool, `
      SELECT d.*
      FROM deliverables d
      WHERE d."proposalId" = $1
      ORDER BY d."createdAt" ASC
    `, [proposalId]);
    return result.rows;
  },

  async getDeliverablesByInfluencer(influencerId, pool) {
    const result = await safeQuery(pool, `
      SELECT d.*, 
             p."listingId", l.title as listingTitle,
             b.name as brandName
      FROM deliverables d
      JOIN proposals p ON d."proposalId" = p.id
      JOIN listings l ON p."listingId" = l.id
      JOIN users b ON l."brandId" = b.id
      WHERE p."influencerId" = $1
      ORDER BY d."createdAt" DESC
    `, [influencerId]);
    return result.rows;
  },

  async getDeliverablesByBrand(brandId, pool) {
    const result = await safeQuery(pool, `
      SELECT d.*, 
             p."influencerId", p."listingId",
             u.name as influencerName,
             l.title as listingTitle
      FROM deliverables d
      JOIN proposals p ON d."proposalId" = p.id
      JOIN users u ON p."influencerId" = u.id
      JOIN listings l ON p."listingId" = l.id
      WHERE l."brandId" = $1
      ORDER BY d."createdAt" DESC
    `, [brandId]);
    return result.rows;
  },

  async updateDeliverable(id, updateData, pool) {
    const { title, description, type, dueDate } = updateData
    
    const result = await safeQuery(pool, `
      UPDATE deliverables 
      SET title = $1, description = $2, type = $3, "dueDate" = $4, "updatedAt" = CURRENT_TIMESTAMP 
      WHERE id = $5
    `, [title, description, type, dueDate, id]);
    return result.rowCount > 0;
  },

  async submitDeliverable(id, submissionData, pool) {
    const { fileUrl, submissionNotes } = submissionData
    
    const result = await safeQuery(pool, `
      UPDATE deliverables 
      SET "fileUrl" = $1, "submissionNotes" = $2, status = 'submitted', "submittedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP 
      WHERE id = $3
    `, [fileUrl, submissionNotes, id]);
    return result.rowCount > 0;
  },

  async reviewDeliverable(id, reviewData, pool) {
    const { status, reviewNotes } = reviewData
    
    const result = await safeQuery(pool, `
      UPDATE deliverables 
      SET status = $1, "reviewNotes" = $2, "reviewedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP 
      WHERE id = $3
    `, [status, reviewNotes, id]);
    return result.rowCount > 0;
  },

  async deleteDeliverable(id, pool) {
    const result = await safeQuery(pool, 'DELETE FROM deliverables WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}

export default dbHelpers;
