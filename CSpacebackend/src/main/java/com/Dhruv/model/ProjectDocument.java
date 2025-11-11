package com.Dhruv.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProjectDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;

    private String fileType; // e.g., "application/pdf"

    private Long fileSize; // in bytes

    @Lob
    @Column(columnDefinition = "LONGBLOB")
    @JsonIgnore
    private byte[] data;

    private LocalDateTime uploadedAt;

    @ManyToOne
    @JoinColumn(name = "project_id")
    @JsonIgnore
    private Project project;

    @ManyToOne
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    // ✅ ADD THIS FIELD
    @Column(name = "is_loaded_inrag", nullable = false)
    private Boolean isLoadedInRag = false;

    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
        // ✅ ADD THIS - Ensure default value on creation
        if (isLoadedInRag == null) {
            isLoadedInRag = false;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public byte[] getData() {
        return data;
    }

    public void setData(byte[] data) {
        this.data = data;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(LocalDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public User getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(User uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    // ✅ ADD GETTER AND SETTER FOR isLoadedInRag
    public Boolean getIsLoadedInRag() {
        return isLoadedInRag;
    }

    public void setIsLoadedInRag(Boolean isLoadedInRag) {
        this.isLoadedInRag = isLoadedInRag;
    }
}