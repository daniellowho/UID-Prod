package com.eventmanagement.service;

import com.eventmanagement.exception.ResourceNotFoundException;
import com.eventmanagement.model.Category;
import com.eventmanagement.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CategoryService {

    @Autowired private CategoryRepository categoryRepository;

    public List<Category> getAllCategories() {
        return categoryRepository.findByActive(true);
    }

    public List<Category> getAllCategoriesAdmin() {
        return categoryRepository.findAll();
    }

    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
    }

    public Category createCategory(Category category) {
        return categoryRepository.save(category);
    }

    public Category updateCategory(Long id, Category updated) {
        Category category = getCategoryById(id);
        category.setName(updated.getName());
        category.setDescription(updated.getDescription());
        category.setIconUrl(updated.getIconUrl());
        category.setActive(updated.isActive());
        return categoryRepository.save(category);
    }

    public void deleteCategory(Long id) {
        Category category = getCategoryById(id);
        category.setActive(false);
        categoryRepository.save(category);
    }
}
