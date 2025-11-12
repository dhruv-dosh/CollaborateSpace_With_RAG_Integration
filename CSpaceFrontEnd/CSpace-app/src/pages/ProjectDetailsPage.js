import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import OverviewTab from '../components/OverviewTab';
import RequirementsTab from '../components/RequirementsTab';
import ChatTab from '../components/ChatTab';
import DocumentsTab from '../components/DocumentsTab';
import AIChatTab from '../components/AIChatTab';

const ProjectDetailsPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchProjectDetails();
    fetchRequirements();
    fetchMessages();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const res = await api.get(`/api/projects/${projectId}`);
      setProject(res.data);
    } catch (err) {
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequirements = async () => {
    try {
      const res = await api.get(`/api/requirements/project/${projectId}`);
      setRequirements(res.data);
    } catch (err) {
      console.error('Error fetching requirements:', err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/api/messages/chat/${projectId}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return <div className="text-center mt-12">Project not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
        <p className="text-gray-600 mb-4">{project.description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {project.tags?.map((tag, idx) => (
            <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {tag}
            </span>
          ))}
        </div>
        <div className="text-sm text-gray-500">
          <span>Category: {project.category}</span>
          <span className="mx-4">•</span>
          <span>{project.team?.length || 0} team members</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'overview'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('requirements')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'requirements'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Requirements ({requirements.length})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'documents'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <span className="flex items-center gap-2">
                Ask Questions
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'chat'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Team Chat
            </button>
            
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab project={project} onRefresh={fetchProjectDetails} />
          )}
          {activeTab === 'requirements' && (
            <RequirementsTab
              projectId={projectId}
              requirements={requirements}
              onRefresh={fetchRequirements}
              project={project}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab
              projectId={projectId}
              project={project}
            />
          )}
          
          {activeTab === 'chat' && (
            <ChatTab
              projectId={projectId}
              messages={messages}
              user={user}
              project={project}
              onRefresh={fetchMessages}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;