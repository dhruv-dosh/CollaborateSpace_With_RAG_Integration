package com.Dhruv.repository;

import com.Dhruv.model.ProjectDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectDocumentRepository extends JpaRepository<ProjectDocument, Long> {

    List<ProjectDocument> findByProjectId(Long projectId);

    Optional<ProjectDocument> findByIdAndProjectId(Long id, Long projectId);

    void deleteByIdAndProjectId(Long id, Long projectId);

    long countByProjectId(Long projectId);
}