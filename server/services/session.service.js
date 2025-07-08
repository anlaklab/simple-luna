/**
 * Session Service with Real Versioning System
 * 
 * Handles chat sessions with comprehensive version control:
 * - Version tracking (v1, v2, v3, etc.)
 * - Diff generation between versions
 * - Revert to previous versions
 * - Branch creation from versions
 * - NO MOCK DATA - Everything stored in Firestore
 */

const { getFirestore } = require('../config/firebase');

class SessionService {
  constructor(firestore) {
    this.firestore = firestore;
    this.initialized = !!firestore;
    
    if (this.initialized) {
      console.log('✅ SessionService with versioning initialized');
    } else {
      console.warn('⚠️ SessionService not initialized - Firestore not available');
    }
  }

  isAvailable() {
    return this.initialized && this.firestore;
  }

  /**
   * Create new session with version control
   */
  async createSession(sessionData) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      const sessionId = sessionData.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const session = {
        sessionId: sessionId,
        title: sessionData.title || 'New Session',
        description: sessionData.description || '',
        userId: sessionData.userId || 'anonymous',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        
        // Version control metadata
        versioning: {
          enabled: true,
          currentVersion: 1,
          totalVersions: 1,
          lastVersionAt: new Date().toISOString(),
          versioningStrategy: 'auto', // auto, manual, milestone
          maxVersions: 50 // Limit to prevent bloat
        },
        
        // Current state (always reflects latest version)
        messages: sessionData.messages || [],
        presentations: sessionData.presentations || [],
        metadata: sessionData.metadata || {},
        
        // Workflow state
        workflow: {
          currentStep: 'initial',
          completedSteps: [],
          nextSteps: ['conversation']
        }
      };

      // Save main session document
      await this.firestore.collection('chat_sessions').doc(sessionId).set(session);
      
      // Create initial version (v1)
      await this.createVersion(sessionId, {
        versionNumber: 1,
        description: 'Initial session creation',
        changeType: 'creation',
        data: {
          messages: session.messages,
          presentations: session.presentations,
          metadata: session.metadata
        },
        createdBy: sessionData.userId || 'system',
        parentVersion: null
      });

      console.log(`✅ Session created with versioning: ${sessionId}`);
      return { sessionId, session };

    } catch (error) {
      console.error('❌ Failed to create session:', error);
      throw new Error(`Session creation failed: ${error.message}`);
    }
  }

  /**
   * Create new version of session data
   */
  async createVersion(sessionId, versionData) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      const versionId = `v${versionData.versionNumber}`;
      
      const version = {
        sessionId: sessionId,
        versionId: versionId,
        versionNumber: versionData.versionNumber,
        description: versionData.description || `Version ${versionData.versionNumber}`,
        changeType: versionData.changeType || 'update', // creation, update, branch, merge
        createdAt: new Date().toISOString(),
        createdBy: versionData.createdBy || 'system',
        
        // Version relationships
        parentVersion: versionData.parentVersion,
        childVersions: [],
        branchName: versionData.branchName || 'main',
        
        // Snapshot of data at this version
        data: {
          messages: versionData.data.messages || [],
          presentations: versionData.data.presentations || [],
          metadata: versionData.data.metadata || {}
        },
        
        // Change tracking
        changes: versionData.changes || [],
        diffSummary: versionData.diffSummary || '',
        
        // Statistics
        stats: {
          messageCount: versionData.data.messages?.length || 0,
          presentationCount: versionData.data.presentations?.length || 0,
          totalChanges: versionData.changes?.length || 0
        }
      };

      // Save version document
      await this.firestore
        .collection('chat_sessions')
        .doc(sessionId)
        .collection('versions')
        .doc(versionId)
        .set(version);

      // Update parent version if exists
      if (versionData.parentVersion) {
        await this.addChildVersion(sessionId, versionData.parentVersion, versionId);
      }

      console.log(`✅ Version ${versionId} created for session ${sessionId}`);
      return version;

    } catch (error) {
      console.error('❌ Failed to create version:', error);
      throw new Error(`Version creation failed: ${error.message}`);
    }
  }

  /**
   * Add message to session and create new version
   */
  async addMessage(sessionId, messageData, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      // Get current session
      const sessionDoc = await this.firestore.collection('chat_sessions').doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const session = sessionDoc.data();
      const newMessage = {
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: messageData.content,
        role: messageData.role || 'user', // user, assistant, system
        timestamp: new Date().toISOString(),
        metadata: messageData.metadata || {}
      };

      // Add message to current session
      const updatedMessages = [...(session.messages || []), newMessage];
      
      // Update session
      await this.firestore.collection('chat_sessions').doc(sessionId).update({
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
        'versioning.lastVersionAt': new Date().toISOString()
      });

      // Create new version if auto-versioning is enabled
      if (options.createVersion !== false && session.versioning?.enabled) {
        const newVersionNumber = (session.versioning.currentVersion || 1) + 1;
        
        await this.createVersion(sessionId, {
          versionNumber: newVersionNumber,
          description: `Added message: ${messageData.content.substring(0, 50)}...`,
          changeType: 'message_added',
          data: {
            messages: updatedMessages,
            presentations: session.presentations || [],
            metadata: session.metadata || {}
          },
          createdBy: messageData.userId || 'user',
          parentVersion: `v${session.versioning.currentVersion}`,
          changes: [{
            type: 'message_added',
            messageId: newMessage.messageId,
            content: newMessage.content,
            timestamp: newMessage.timestamp
          }],
          diffSummary: `Added 1 message`
        });

        // Update session version info
        await this.firestore.collection('chat_sessions').doc(sessionId).update({
          'versioning.currentVersion': newVersionNumber,
          'versioning.totalVersions': newVersionNumber
        });
      }

      console.log(`✅ Message added to session ${sessionId}`);
      return { messageId: newMessage.messageId, message: newMessage };

    } catch (error) {
      console.error('❌ Failed to add message:', error);
      throw new Error(`Add message failed: ${error.message}`);
    }
  }

  /**
   * Add generated presentation to session and create new version
   */
  async addGeneratedPresentation(sessionId, presentationData, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      // Get current session
      const sessionDoc = await this.firestore.collection('chat_sessions').doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const session = sessionDoc.data();
      const newPresentation = {
        ...presentationData,
        addedAt: new Date().toISOString(),
        versionAdded: session.versioning?.currentVersion || 1
      };

      // Add presentation to current session
      const updatedPresentations = [...(session.presentations || []), newPresentation];
      
      // Update session
      await this.firestore.collection('chat_sessions').doc(sessionId).update({
        presentations: updatedPresentations,
        updatedAt: new Date().toISOString(),
        'versioning.lastVersionAt': new Date().toISOString()
      });

      // Create new version
      if (options.createVersion !== false && session.versioning?.enabled) {
        const newVersionNumber = (session.versioning.currentVersion || 1) + 1;
        
        await this.createVersion(sessionId, {
          versionNumber: newVersionNumber,
          description: `Added presentation: ${presentationData.title}`,
          changeType: 'presentation_added',
          data: {
            messages: session.messages || [],
            presentations: updatedPresentations,
            metadata: session.metadata || {}
          },
          createdBy: presentationData.createdBy || 'ai',
          parentVersion: `v${session.versioning.currentVersion}`,
          changes: [{
            type: 'presentation_added',
            presentationId: presentationData.presentationId,
            title: presentationData.title,
            slideCount: presentationData.slideCount,
            timestamp: new Date().toISOString()
          }],
          diffSummary: `Added presentation: ${presentationData.title} (${presentationData.slideCount} slides)`
        });

        // Update session version info
        await this.firestore.collection('chat_sessions').doc(sessionId).update({
          'versioning.currentVersion': newVersionNumber,
          'versioning.totalVersions': newVersionNumber
        });
      }

      console.log(`✅ Presentation added to session ${sessionId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to add presentation:', error);
      throw new Error(`Failed to add presentation reference: ${error.message}`);
    }
  }

  /**
   * Get version history for session
   */
  async getVersionHistory(sessionId, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      const versionsSnapshot = await this.firestore
        .collection('chat_sessions')
        .doc(sessionId)
        .collection('versions')
        .orderBy('versionNumber', options.order || 'desc')
        .limit(options.limit || 50)
        .get();

      const versions = [];
      versionsSnapshot.forEach(doc => {
        const version = doc.data();
        versions.push({
          versionId: version.versionId,
          versionNumber: version.versionNumber,
          description: version.description,
          changeType: version.changeType,
          createdAt: version.createdAt,
          createdBy: version.createdBy,
          branchName: version.branchName,
          stats: version.stats,
          diffSummary: version.diffSummary,
          parentVersion: version.parentVersion,
          childVersions: version.childVersions
        });
      });

      return versions;

    } catch (error) {
      console.error('❌ Failed to get version history:', error);
      throw new Error(`Get version history failed: ${error.message}`);
    }
  }

  /**
   * Get specific version data
   */
  async getVersion(sessionId, versionId) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      const versionDoc = await this.firestore
        .collection('chat_sessions')
        .doc(sessionId)
        .collection('versions')
        .doc(versionId)
        .get();

      if (!versionDoc.exists) {
        throw new Error(`Version ${versionId} not found in session ${sessionId}`);
      }

      return versionDoc.data();

    } catch (error) {
      console.error('❌ Failed to get version:', error);
      throw new Error(`Get version failed: ${error.message}`);
    }
  }

  /**
   * Revert session to specific version
   */
  async revertToVersion(sessionId, targetVersionId, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      // Get target version data
      const targetVersion = await this.getVersion(sessionId, targetVersionId);
      
      // Get current session
      const sessionDoc = await this.firestore.collection('chat_sessions').doc(sessionId).get();
      const session = sessionDoc.data();

      // Update session with target version data
      await this.firestore.collection('chat_sessions').doc(sessionId).update({
        messages: targetVersion.data.messages,
        presentations: targetVersion.data.presentations,
        metadata: targetVersion.data.metadata,
        updatedAt: new Date().toISOString(),
        'versioning.lastVersionAt': new Date().toISOString()
      });

      // Create revert version
      if (options.createVersion !== false) {
        const newVersionNumber = (session.versioning.currentVersion || 1) + 1;
        
        await this.createVersion(sessionId, {
          versionNumber: newVersionNumber,
          description: `Reverted to ${targetVersionId}: ${targetVersion.description}`,
          changeType: 'revert',
          data: targetVersion.data,
          createdBy: options.userId || 'user',
          parentVersion: `v${session.versioning.currentVersion}`,
          changes: [{
            type: 'revert',
            targetVersion: targetVersionId,
            timestamp: new Date().toISOString()
          }],
          diffSummary: `Reverted to version ${targetVersion.versionNumber}`
        });

        // Update session version info
        await this.firestore.collection('chat_sessions').doc(sessionId).update({
          'versioning.currentVersion': newVersionNumber,
          'versioning.totalVersions': newVersionNumber
        });
      }

      console.log(`✅ Session ${sessionId} reverted to ${targetVersionId}`);
      return { success: true, revertedTo: targetVersionId };

    } catch (error) {
      console.error('❌ Failed to revert session:', error);
      throw new Error(`Revert failed: ${error.message}`);
    }
  }

  /**
   * Create branch from specific version
   */
  async createBranch(sessionId, sourceVersionId, branchName, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      // Get source version
      const sourceVersion = await this.getVersion(sessionId, sourceVersionId);
      
      // Create new session for branch
      const branchSessionId = `${sessionId}_branch_${branchName}_${Date.now()}`;
      
      const branchSession = {
        sessionId: branchSessionId,
        title: `${options.title || 'Branch'}: ${branchName}`,
        description: options.description || `Branch created from ${sourceVersionId}`,
        userId: options.userId || 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        
        // Branch metadata
        branch: {
          isBranch: true,
          parentSession: sessionId,
          sourceVersion: sourceVersionId,
          branchName: branchName,
          createdFrom: sourceVersion.description
        },
        
        // Copy versioning config
        versioning: {
          enabled: true,
          currentVersion: 1,
          totalVersions: 1,
          lastVersionAt: new Date().toISOString(),
          versioningStrategy: 'auto',
          maxVersions: 50
        },
        
        // Copy data from source version
        messages: sourceVersion.data.messages,
        presentations: sourceVersion.data.presentations,
        metadata: sourceVersion.data.metadata,
        
        workflow: {
          currentStep: 'branched',
          completedSteps: ['branch_created'],
          nextSteps: ['conversation']
        }
      };

      // Save branch session
      await this.firestore.collection('chat_sessions').doc(branchSessionId).set(branchSession);
      
      // Create initial version for branch
      await this.createVersion(branchSessionId, {
        versionNumber: 1,
        description: `Branch created from ${sessionId}:${sourceVersionId}`,
        changeType: 'branch',
        data: sourceVersion.data,
        createdBy: options.userId || 'user',
        parentVersion: null,
        branchName: branchName
      });

      console.log(`✅ Branch ${branchName} created: ${branchSessionId}`);
      return { 
        branchSessionId, 
        branchName, 
        sourceVersion: sourceVersionId,
        session: branchSession 
      };

    } catch (error) {
      console.error('❌ Failed to create branch:', error);
      throw new Error(`Branch creation failed: ${error.message}`);
    }
  }

  /**
   * Generate diff between two versions
   */
  async generateDiff(sessionId, version1Id, version2Id) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      const [version1, version2] = await Promise.all([
        this.getVersion(sessionId, version1Id),
        this.getVersion(sessionId, version2Id)
      ]);

      const diff = {
        sessionId,
        comparison: `${version1Id} → ${version2Id}`,
        generatedAt: new Date().toISOString(),
        
        messages: this.diffArrays(version1.data.messages, version2.data.messages, 'messageId'),
        presentations: this.diffArrays(version1.data.presentations, version2.data.presentations, 'presentationId'),
        metadata: this.diffObjects(version1.data.metadata, version2.data.metadata),
        
        summary: {
          messagesAdded: 0,
          messagesRemoved: 0,
          presentationsAdded: 0,
          presentationsRemoved: 0,
          metadataChanged: 0
        }
      };

      // Calculate summary
      diff.summary.messagesAdded = diff.messages.added.length;
      diff.summary.messagesRemoved = diff.messages.removed.length;
      diff.summary.presentationsAdded = diff.presentations.added.length;
      diff.summary.presentationsRemoved = diff.presentations.removed.length;
      diff.summary.metadataChanged = Object.keys(diff.metadata.changed).length;

      return diff;

    } catch (error) {
      console.error('❌ Failed to generate diff:', error);
      throw new Error(`Diff generation failed: ${error.message}`);
    }
  }

  /**
   * Helper: Add child version reference
   */
  async addChildVersion(sessionId, parentVersionId, childVersionId) {
    try {
      const parentVersionRef = this.firestore
        .collection('chat_sessions')
        .doc(sessionId)
        .collection('versions')
        .doc(parentVersionId);

      await parentVersionRef.update({
        childVersions: this.firestore.FieldValue.arrayUnion(childVersionId)
      });

    } catch (error) {
      console.warn('⚠️ Failed to update parent version:', error.message);
    }
  }

  /**
   * Helper: Diff two arrays
   */
  diffArrays(array1, array2, idField) {
    const ids1 = new Set((array1 || []).map(item => item[idField]));
    const ids2 = new Set((array2 || []).map(item => item[idField]));
    
    return {
      added: (array2 || []).filter(item => !ids1.has(item[idField])),
      removed: (array1 || []).filter(item => !ids2.has(item[idField])),
      common: (array2 || []).filter(item => ids1.has(item[idField]))
    };
  }

  /**
   * Helper: Diff two objects
   */
  diffObjects(obj1, obj2) {
    const keys1 = Object.keys(obj1 || {});
    const keys2 = Object.keys(obj2 || {});
    const allKeys = new Set([...keys1, ...keys2]);
    
    const diff = {
      added: {},
      removed: {},
      changed: {},
      unchanged: {}
    };

    allKeys.forEach(key => {
      const val1 = (obj1 || {})[key];
      const val2 = (obj2 || {})[key];
      
      if (val1 === undefined && val2 !== undefined) {
        diff.added[key] = val2;
      } else if (val1 !== undefined && val2 === undefined) {
        diff.removed[key] = val1;
      } else if (val1 !== val2) {
        diff.changed[key] = { from: val1, to: val2 };
      } else {
        diff.unchanged[key] = val1;
      }
    });

    return diff;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Session data
   */
  async getSession(sessionId) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      const doc = await this.firestore.collection('chat_sessions').doc(sessionId).get();
      
      if (!doc.exists) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const data = doc.data();
      
      // Update last active time
      await this.updateLastActive(sessionId);

      return { success: true, data };

    } catch (error) {
      console.error(`❌ Error getting session ${sessionId}:`, error);
      throw new Error(`Failed to get session: ${error.message}`);
    }
  }

  /**
   * Update session metadata
   * @param {string} sessionId - Session identifier
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated session
   */
  async updateSession(sessionId, updates) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      const allowedUpdates = ['title', 'isBookmarked', 'tags', 'settings', 'status'];
      const sanitizedUpdates = {};

      // Only allow specific fields to be updated
      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          sanitizedUpdates[key] = value;
        }
      }

      // Add update timestamp
      sanitizedUpdates.updatedAt = new Date().toISOString();

      await this.firestore.collection('chat_sessions').doc(sessionId).update(sanitizedUpdates);

      console.log(`✅ Updated session ${sessionId}`);
      return { success: true, updates: sanitizedUpdates };

    } catch (error) {
      console.error(`❌ Error updating session ${sessionId}:`, error);
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  /**
   * Archive session (soft delete)
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Success result
   */
  async archiveSession(sessionId) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      await this.updateSession(sessionId, { status: 'archived' });
      console.log(`✅ Archived session ${sessionId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error archiving session ${sessionId}:`, error);
      throw new Error(`Failed to archive session: ${error.message}`);
    }
  }

  /**
   * Delete session permanently
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Success result
   */
  async deleteSession(sessionId) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      await this.firestore.collection('chat_sessions').doc(sessionId).delete();
      console.log(`✅ Deleted session ${sessionId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error deleting session ${sessionId}:`, error);
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  /**
   * Get user sessions with pagination and filtering
   * @param {string} userId - User identifier (null for anonymous)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Sessions list with pagination
   */
  async getUserSessions(userId, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('SessionService not available');
    }

    try {
      const {
        limit = 20,
        offset = 0,
        status = 'active',
        orderBy = 'lastActiveAt',
        orderDirection = 'desc',
        bookmarkedOnly = false,
        tags = []
      } = options;

      let query = this.firestore.collection('chat_sessions');

      // Filter by user (include both user sessions and anonymous if userId is null)
      if (userId) {
        query = query.where('userId', '==', userId);
      } else {
        query = query.where('userId', '==', null);
      }

      // Filter by status
      if (status !== 'all') {
        query = query.where('status', '==', status);
      }

      // Filter by bookmarked
      if (bookmarkedOnly) {
        query = query.where('isBookmarked', '==', true);
      }

      // Filter by tags
      if (tags.length > 0) {
        query = query.where('tags', 'array-contains-any', tags);
      }

      // Order results
      query = query.orderBy(orderBy, orderDirection);

      // Apply pagination
      if (offset > 0) {
        const offsetDoc = await query.limit(offset).get();
        if (!offsetDoc.empty) {
          const lastDoc = offsetDoc.docs[offsetDoc.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }

      query = query.limit(limit);

      const snapshot = await query.get();
      const sessions = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        // Remove messages from list view for performance
        sessions.push({
          ...data,
          messages: undefined, // Don't include full message history in list
          messagePreview: data.messages?.[data.messages.length - 1]?.content?.substring(0, 100) || null
        });
      });

      // Get total count for pagination
      const totalQuery = this.firestore.collection('chat_sessions');
      if (userId) {
        totalQuery.where('userId', '==', userId);
      } else {
        totalQuery.where('userId', '==', null);
      }
      
      const totalSnapshot = await totalQuery.count().get();
      const total = totalSnapshot.data().count;

      console.log(`✅ Retrieved ${sessions.length} sessions for user ${userId || 'anonymous'}`);
      
      return {
        success: true,
        data: sessions,
        pagination: {
          limit,
          offset,
          total,
          hasMore: sessions.length === limit
        }
      };

    } catch (error) {
      console.error(`❌ Error getting user sessions:`, error);
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }
  }

  // Helper methods
  updateLastActive(sessionId) {
    return this.firestore.collection('chat_sessions').doc(sessionId).update({
      lastActiveAt: new Date().toISOString()
    });
  }

  hashIP(ip) {
    // Simple hash for privacy (use crypto in production)
    return require('crypto').createHash('sha256').update(ip).digest('hex').substring(0, 16);
  }

  validateSessionData(data) {
    // Basic validation - extend as needed
    if (!data.sessionId) throw new Error('Session ID is required');
    if (data.messages && !Array.isArray(data.messages)) throw new Error('Messages must be an array');
    if (data.tags && !Array.isArray(data.tags)) throw new Error('Tags must be an array');
  }
}

module.exports = SessionService; 