import React, { useState, useRef, useEffect } from 'react';

const AIChatTab = ({ projectId }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);
  const currentResponseRef = useRef('');
  const currentMessageIdRef = useRef(null);

  useEffect(() => {
    loadProjectData();
    connectWebSocket();
    
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [projectId]);

  const connectWebSocket = () => {
    // Use relative URL construction like in rag.js
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
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage && lastMessage.id === currentMessageIdRef.current && lastMessage.type === 'ai-loading') {
            // Update the loading message with actual content
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              type: 'ai',
              content: currentResponseRef.current,
            };
          }
          
          return newMessages;
        });
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setIsLoading(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setIsLoading(false);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadProjectData = async () => {
    try {
      const result = await window.storage.get(`ai-chat-messages:${projectId}`);
      if (result) {
        const data = JSON.parse(result.value);
        setMessages(data.messages || []);
        setUploadedFiles(data.files || []);
      }
    } catch (error) {
      console.log('No previous messages found for this project');
    }
  };

  const saveProjectData = async (newMessages, newFiles) => {
    try {
      // Filter out loading messages before saving
      const messagesToSave = newMessages.filter(m => m.type !== 'ai-loading');
      
      await window.storage.set(
        `ai-chat-messages:${projectId}`,
        JSON.stringify({
          messages: messagesToSave,
          files: newFiles,
        })
      );
    } catch (error) {
      console.error('Error saving project data:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('fileToUpload', file);

    try {
      const response = await fetch(`http://localhost:8082/upload?projectId=${projectId}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const newFile = {
          name: file.name,
          uploadedAt: new Date().toISOString(),
        };
        
        const updatedFiles = [...uploadedFiles, newFile];
        setUploadedFiles(updatedFiles);

        const systemMessage = {
          id: Date.now() + '-system',
          type: 'system',
          content: `Document "${file.name}" uploaded successfully! You can now ask questions about it.`,
          timestamp: new Date().toISOString(),
        };

        const updatedMessages = [...messages, systemMessage];
        setMessages(updatedMessages);
        
        await saveProjectData(updatedMessages, updatedFiles);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    if (uploadedFiles.length === 0) {
      alert('Please upload a document first before asking questions.');
      return;
    }

    if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('WebSocket is not connected. Please refresh the page.');
      return;
    }

    const userMessageId = Date.now() + '-user';
    const aiMessageId = Date.now() + '-ai';
    
    const userMessage = {
      id: userMessageId,
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    const loadingMessage = {
      id: aiMessageId,
      type: 'ai-loading',
      content: '',
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage, loadingMessage];
    setMessages(updatedMessages);
    
    const questionToSend = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    currentResponseRef.current = '';
    currentMessageIdRef.current = aiMessageId;

    try {
      console.log('Sending message via WebSocket:', questionToSend);
      // Send message through WebSocket (like in rag.js)
      wsRef.current.send(questionToSend);
      
      // Wait for the response to complete streaming
      // We'll mark loading as false after a reasonable timeout
      setTimeout(async () => {
        setIsLoading(false);
        
        // Save the updated messages (filtering out loading states)
        const finalMessages = messages.filter(m => m.type !== 'ai-loading');
        const currentMessages = [...finalMessages, userMessage];
        
        // Add the completed AI message
        if (currentResponseRef.current) {
          currentMessages.push({
            id: aiMessageId,
            type: 'ai',
            content: currentResponseRef.current,
            timestamp: new Date().toISOString(),
          });
        }
        
        await saveProjectData(currentMessages, uploadedFiles);
      }, 3000); // Give 3 seconds for streaming to complete
      
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      
      const errorMessage = {
        id: Date.now() + '-error',
        type: 'error',
        content: 'Failed to get response. Please try again.',
        timestamp: new Date().toISOString(),
      };
      
      const finalMessages = [...messages, userMessage, errorMessage];
      setMessages(finalMessages);
      await saveProjectData(finalMessages, uploadedFiles);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = async () => {
    if (window.confirm('Are you sure you want to clear all messages and uploaded files for this project?')) {
      try {
        await window.storage.delete(`ai-chat-messages:${projectId}`);
        setMessages([]);
        setUploadedFiles([]);
      } catch (error) {
        console.error('Error clearing chat:', error);
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with project info and controls */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-100 text-lg">RAGBot with Spring AI</h3>
              <p className="text-sm text-gray-300 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                {isConnected ? 'Connected' : 'Disconnected'} • {uploadedFiles.length} document{uploadedFiles.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="px-3 py-2 text-sm text-red-400 hover:bg-slate-600 rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}
        </div>

        {/* Upload Section */}
        <div className="flex items-center justify-between bg-slate-700 rounded-lg p-3 border border-slate-600">
          <div className="flex items-center gap-2 flex-1">
            <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-medium text-gray-200">
              {uploadedFiles.length === 0 ? 'No documents yet' : `${uploadedFiles.length} document(s) ready`}
            </span>
          </div>
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            <span className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition inline-flex items-center gap-2 text-sm font-medium">
              {isUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Upload PDF
                </>
              )}
            </span>
          </label>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-3 space-y-1">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-gray-300 bg-slate-600 px-3 py-2 rounded border border-slate-500">
                <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <span className="flex-1 font-medium">{file.name}</span>
                <span className="text-gray-400">{new Date(file.uploadedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto bg-slate-900 rounded-lg p-4 mb-4 min-h-[400px] max-h-[600px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <h1 className="text-4xl font-bold mb-4 text-gray-200">RAGBot with Spring AI</h1>
            <p className="text-center mb-2">Start a conversation with the uploaded document.</p>
            <p className="text-sm text-center">Your chat history will be displayed here.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {messages.map((message, idx) => (
              <div
                key={message.id || idx}
                className={`flex justify-center py-6 px-2 border-b border-slate-700 ${
                  message.type === 'user' ? 'bg-slate-800' : 'bg-slate-900'
                }`}
              >
                <div className="max-w-4xl w-full flex items-start gap-4">
                  <img 
                    src={message.type === 'user' ? '/images/person.png' : '/images/spring-ai-logo.png'} 
                    alt="avatar" 
                    className="w-9 h-9 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    {message.type === 'ai-loading' ? (
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                      </div>
                    ) : message.type === 'system' ? (
                      <p className="text-green-400 text-sm whitespace-pre-wrap">{message.content}</p>
                    ) : message.type === 'error' ? (
                      <p className="text-red-400 text-sm whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    )}
                  </div>
                  {message.type === 'ai' && message.content && (
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className="text-teal-400 hover:text-teal-300 flex-shrink-0"
                      title="Copy response"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-lg">
        <div className="flex items-end gap-2 p-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={uploadedFiles.length > 0 ? "Enter a prompt here" : "Upload a document to start chatting..."}
            disabled={uploadedFiles.length === 0 || isLoading || !isConnected}
            className="flex-1 resize-none border-0 focus:ring-0 focus:outline-none p-3 max-h-32 bg-slate-700 text-gray-100 rounded-lg placeholder-gray-400"
            rows={1}
            style={{
              minHeight: '55px',
              maxHeight: '120px',
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || uploadedFiles.length === 0 || isLoading || !isConnected}
            className="px-4 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition disabled:bg-slate-600 disabled:cursor-not-allowed flex-shrink-0 h-[55px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatTab;