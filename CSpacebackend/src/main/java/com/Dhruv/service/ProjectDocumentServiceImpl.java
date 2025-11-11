package com.Dhruv.service;

import com.Dhruv.exception.ProjectException;
import com.Dhruv.exception.UserException;
import com.Dhruv.model.Project;
import com.Dhruv.model.ProjectDocument;
import com.Dhruv.model.User;
import com.Dhruv.repository.ProjectDocumentRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
public class ProjectDocumentServiceImpl implements ProjectDocumentService {

    @Autowired
    private ProjectDocumentRepository documentRepository;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private UserService userService;

    @Override
    @Transactional
    public ProjectDocument uploadDocument(Long projectId, MultipartFile file, Long userId)
            throws ProjectException, UserException, IOException {

        // Verify project exists
        Project project = projectService.getProjectById(projectId);

        // Verify user exists and has access to project
        User user = userService.findUserById(userId);

        if (!project.getTeam().contains(user) && !project.getOwner().getId().equals(userId)) {
            throw new ProjectException("You don't have access to this project");
        }

        // Validate file
        if (file.isEmpty()) {
            throw new ProjectException("File is empty");
        }

        // Optional: Validate file type (only PDFs)
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            throw new ProjectException("Only PDF files are allowed");
        }

        // Optional: Validate file size (e.g., max 10MB)
        long maxSize = 10 * 1024 * 1024; // 10MB
        if (file.getSize() > maxSize) {
            throw new ProjectException("File size exceeds maximum limit of 10MB");
        }

        // Create document entity
        ProjectDocument document = new ProjectDocument();
        document.setFileName(file.getOriginalFilename());
        document.setFileType(file.getContentType());
        document.setFileSize(file.getSize());
        document.setData(file.getBytes());
        document.setProject(project);
        document.setUploadedBy(user);

        return documentRepository.save(document);
    }

    @Override
    public ProjectDocument getDocument(Long documentId, Long projectId) throws ProjectException {
        return documentRepository.findByIdAndProjectId(documentId, projectId)
                .orElseThrow(() -> new ProjectException("Document not found"));
    }

    @Override
    public List<ProjectDocument> getProjectDocuments(Long projectId) throws ProjectException {
        // Verify project exists
        projectService.getProjectById(projectId);

        return documentRepository.findByProjectId(projectId);
    }

    @Override
    @Transactional
    public String deleteDocument(Long documentId, Long projectId, Long userId)
            throws ProjectException, UserException {

        // Verify document exists
        ProjectDocument document = documentRepository.findByIdAndProjectId(documentId, projectId)
                .orElseThrow(() -> new ProjectException("Document not found"));

        // Verify user exists
        User user = userService.findUserById(userId);

        Project project = document.getProject();

        // Only owner or uploader can delete
        if (!project.getOwner().getId().equals(userId) &&
                !document.getUploadedBy().getId().equals(userId)) {
            throw new ProjectException("You don't have permission to delete this document");
        }

        documentRepository.deleteById(documentId);

        return "Document deleted successfully";
    }
}