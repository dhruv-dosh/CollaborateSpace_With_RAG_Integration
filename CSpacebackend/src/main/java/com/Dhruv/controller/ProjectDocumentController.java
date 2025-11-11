package com.Dhruv.controller;

import com.Dhruv.exception.ProjectException;
import com.Dhruv.exception.UserException;
import com.Dhruv.model.ProjectDocument;
import com.Dhruv.model.User;
import com.Dhruv.response.DocumentResponse;
import com.Dhruv.response.MessageResponse;
import com.Dhruv.service.ProjectDocumentService;
import com.Dhruv.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects/{projectId}/documents")
public class ProjectDocumentController {

    @Autowired
    private ProjectDocumentService documentService;

    @Autowired
    private UserService userService;

    /**
     * Upload a PDF document to a project
     * POST /api/projects/{projectId}/documents
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadDocument(
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String jwt) throws UserException, ProjectException, IOException {

        User user = userService.findUserProfileByJwt(jwt);

        ProjectDocument document = documentService.uploadDocument(projectId, file, user.getId());

        DocumentResponse response = mapToResponse(document);

        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Get all documents for a project
     * GET /api/projects/{projectId}/documents
     */
    @GetMapping
    public ResponseEntity<List<DocumentResponse>> getProjectDocuments(
            @PathVariable Long projectId,
            @RequestHeader("Authorization") String jwt) throws ProjectException, UserException {

        userService.findUserProfileByJwt(jwt);

        List<ProjectDocument> documents = documentService.getProjectDocuments(projectId);

        List<DocumentResponse> responses = documents.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    /**
     * Download a specific document
     * GET /api/projects/{projectId}/documents/{documentId}/download
     */
    @GetMapping("/{documentId}/download")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable Long projectId,
            @PathVariable Long documentId,
            @RequestHeader("Authorization") String jwt) throws ProjectException, UserException {

        userService.findUserProfileByJwt(jwt);

        ProjectDocument document = documentService.getDocument(documentId, projectId);

        ByteArrayResource resource = new ByteArrayResource(document.getData());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.getFileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + document.getFileName() + "\"")
                .contentLength(document.getFileSize())
                .body(resource);
    }

    /**
     * Get document metadata (without file data)
     * GET /api/projects/{projectId}/documents/{documentId}
     */
    @GetMapping("/{documentId}")
    public ResponseEntity<DocumentResponse> getDocumentInfo(
            @PathVariable Long projectId,
            @PathVariable Long documentId,
            @RequestHeader("Authorization") String jwt) throws ProjectException, UserException {

        userService.findUserProfileByJwt(jwt);

        ProjectDocument document = documentService.getDocument(documentId, projectId);

        DocumentResponse response = mapToResponse(document);

        return ResponseEntity.ok(response);
    }

    /**
     * Delete a document
     * DELETE /api/projects/{projectId}/documents/{documentId}
     */
    @DeleteMapping("/{documentId}")
    public ResponseEntity<MessageResponse> deleteDocument(
            @PathVariable Long projectId,
            @PathVariable Long documentId,
            @RequestHeader("Authorization") String jwt) throws UserException, ProjectException {

        User user = userService.findUserProfileByJwt(jwt);

        String message = documentService.deleteDocument(documentId, projectId, user.getId());

        MessageResponse response = new MessageResponse(message);

        return ResponseEntity.ok(response);
    }

    /**
     * Helper method to map ProjectDocument to DocumentResponse
     */
    private DocumentResponse mapToResponse(ProjectDocument document) {
        DocumentResponse response = new DocumentResponse();
        response.setId(document.getId());
        response.setFileName(document.getFileName());
        response.setFileType(document.getFileType());
        response.setFileSize(document.getFileSize());
        response.setUploadedAt(document.getUploadedAt());
        response.setUploadedBy(document.getUploadedBy().getFullName());
        response.setProjectId(document.getProject().getId());
        return response;
    }
}