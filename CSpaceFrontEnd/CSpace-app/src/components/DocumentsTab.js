import React, { useState, useEffect, useRef } from 'react';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';

const DocumentsTab = ({ projectId, project }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadingToRag, setLoadingToRag] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  
  const wsRef = useRef(null);
  const currentResponseRef = useRef('');
  const currentMessageIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    // Clean up WebSocket on unmount
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const wsUrl = `ws://localhost:8082/ws-chat`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        console.log('Received message chunk:', event.data);
        
        // Accumulate response chunks
        currentResponseRef.current += event.data;
        
        // Update the current AI message with accumulated content
        setChatMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage && lastMessage.id === currentMessageIdRef.current && lastMessage.role === 'assistant-loading') {
            // Update the loading message with actual content
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              role: 'assistant',
              content: currentResponseRef.current,
            };
          }
          
          return newMessages;
        });
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setIsSending(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setIsSending(false);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/projects/${projectId}/documents`);
      console.log('Fetched documents:', res.data);
      setDocuments(res.data);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/api/projects/${projectId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccess('Document uploaded successfully!');
      fetchDocuments();
      e.target.value = '';
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleStartChat = async () => {
    if (documents.length === 0) {
      alert('Please upload at least one document before starting chat');
      return;
    }

    setLoadingToRag(true);
    setError('');
    setSuccess('');

    try {
      // Upload all documents to RAG system
      for (const doc of documents) {
        const response = await api.get(
          `/api/projects/${projectId}/documents/${doc.id}/download`,
          { responseType: 'blob' }
        );

        const file = new File([response.data], doc.fileName, {
          type: doc.fileType,
        });

        const ragFormData = new FormData();
        ragFormData.append('fileToUpload', file);

        const uploadResponse = await fetch(`http://localhost:8082/upload?projectId=${projectId}`, {
          method: 'POST',
          body: ragFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${doc.fileName} to RAG system`);
        }
      }

      setSuccess('Documents loaded successfully!');
      
      // Connect WebSocket
      connectWebSocket();
      
      // Show the chat interface
      setShowChat(true);
      setChatMessages([{
        id: Date.now(),
        role: 'assistant',
        content: `Welcome! I'm ready to answer questions about the ${documents.length} document${documents.length > 1 ? 's' : ''} in this project.`
      }]);

    } catch (err) {
      console.error('Error loading documents to RAG:', err);
      setError('Failed to load documents to chat system. Please try again.');
    } finally {
      setLoadingToRag(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || isSending) return;

    if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('WebSocket is not connected. Please try again.');
      return;
    }

    const userMessageId = Date.now() + '-user';
    const aiMessageId = Date.now() + '-ai';

    const newUserMessage = { 
      id: userMessageId,
      role: 'user', 
      content: userMessage 
    };
    
    const loadingMessage = {
      id: aiMessageId,
      role: 'assistant-loading',
      content: ''
    };

    setChatMessages(prev => [...prev, newUserMessage, loadingMessage]);
    
    const questionToSend = userMessage;
    setUserMessage('');
    setIsSending(true);
    currentResponseRef.current = '';
    currentMessageIdRef.current = aiMessageId;

    try {
      console.log('Sending message via WebSocket:', questionToSend);
      wsRef.current.send(questionToSend);
      
      // Mark loading as complete after reasonable timeout
      setTimeout(() => {
        setIsSending(false);
      }, 500);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setIsSending(false);
      
      setChatMessages(prev => {
        const filtered = prev.filter(m => m.id !== aiMessageId);
        return [...filtered, { 
          id: Date.now(),
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again.' 
        }];
      });
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const response = await api.get(
        `/api/projects/${projectId}/documents/${documentId}/download`,
        {
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Failed to download document');
    }
  };

  const handleDelete = async (documentId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      await api.delete(`/api/projects/${projectId}/documents/${documentId}`);
      setSuccess('Document deleted successfully');
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      alert(err.response?.data?.message || 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const isProjectOwner = () => {
    return user?.id === project?.owner?.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If chat is active, show the chat interface
  if (showChat) {
    return (
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 rounded-full p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Document Chat</h3>
              <p className="text-sm text-gray-600">
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowChat(false);
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
              }
            }}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            ← Back to Documents
          </button>
        </div>

        {/* Chat Messages */}
        <div className="bg-white border border-gray-200 rounded-lg h-96 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : msg.role === 'assistant-loading'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {msg.role === 'assistant-loading' ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    Thinking...
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask a question about the documents..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            disabled={isSending || !isConnected}
          />
          <button
            onClick={handleSendMessage}
            disabled={isSending || !userMessage.trim() || !isConnected}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  // Main documents interface (for both owners and team members)
  return (
    <div className="space-y-6">
      {/* Upload Section - Only for project owners */}
      {isProjectOwner() && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Upload Document</h3>
              <p className="text-sm text-gray-600">PDF files only, maximum 10MB</p>
            </div>
            <label className="cursor-pointer">
              <div className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                {uploading ? 'Uploading...' : 'Select PDF'}
              </div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Start Chat Section */}
      {documents.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-purple-600 rounded-full p-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  AI-Powered Document Chat
                </h3>
                <p className="text-sm text-gray-600">
                  {isProjectOwner() 
                    ? `Load ${documents.length} document${documents.length > 1 ? 's' : ''} and start chatting`
                    : `Chat with ${documents.length} project document${documents.length > 1 ? 's' : ''}`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleStartChat}
              disabled={loadingToRag}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingToRag ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Start Chat
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Documents List */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Documents ({documents.length})
        </h3>

        {documents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg mb-2">No documents uploaded yet</p>
            <p className="text-sm">
              {isProjectOwner() 
                ? 'Upload your first document to get started'
                : 'The project owner hasn\'t uploaded any documents yet'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>

                  <div className="ml-4 flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {doc.fileName}
                    </h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>Uploaded by {doc.uploadedBy}</span>
                      <span>•</span>
                      <span>{formatDate(doc.uploadedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleDownload(doc.id, doc.fileName)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>

                  {isProjectOwner() && (
                    <button
                      onClick={() => handleDelete(doc.id, doc.fileName)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box for team members */}
      {!isProjectOwner() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Team Member Access</h4>
              <p className="text-sm text-blue-800">
                You can view and download all project documents, and chat with them using AI. Only the project owner can upload and delete documents.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsTab;