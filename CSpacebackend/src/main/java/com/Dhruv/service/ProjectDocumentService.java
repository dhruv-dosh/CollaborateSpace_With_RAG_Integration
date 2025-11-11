package com.Dhruv.service;

import com.Dhruv.exception.ProjectException;
import com.Dhruv.exception.UserException;
import com.Dhruv.model.ProjectDocument;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface ProjectDocumentService {

    ProjectDocument uploadDocument(Long projectId, MultipartFile file, Long userId)
            throws ProjectException, UserException, IOException;

    ProjectDocument getDocument(Long documentId, Long projectId)
            throws ProjectException;

    List<ProjectDocument> getProjectDocuments(Long projectId)
            throws ProjectException;

    String deleteDocument(Long documentId, Long projectId, Long userId)
            throws ProjectException, UserException;
}