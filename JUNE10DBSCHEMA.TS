-- Quote
CREATE TABLE quote (
    quote_id INT PRIMARY KEY,
    project_id INT NOT NULL,
    organization_id INT NOT NULL,
    quote_code VARCHAR(50) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES project(project_id),
    FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);

-- Quote Version
CREATE TABLE quote_version (
    version_id INT PRIMARY KEY,
    quote_id INT NOT NULL,
    version_number VARCHAR(10) NOT NULL,
    status_id INT NOT NULL,
    FOREIGN KEY (quote_id) REFERENCES quote(quote_id)
);

-- Quote Item
CREATE TABLE quote_item (
    item_id INT PRIMARY KEY,
    version_id INT NOT NULL,
    quote_cost_model_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (version_id) REFERENCES quote_version(version_id)
);



CREATE TABLE quote_cost_model_revision (
    quote_cost_model_id INT PRIMARY KEY,
    quote_id INT NOT NULL,
    quote_item_id INT NOT NULL,
    version_number VARCHAR(10),
    quoted_model_name VARCHAR(100),
    source_cost_model_id INT NOT NULL,
    source_revision_id INT NOT NULL,
    company_id INT,
    category_id INT,
    burden VARCHAR(10),
    estimated_cost NUMERIC(12, 2),
    cost_matrix_json JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quote(quote_id),
    FOREIGN KEY (quote_item_id) REFERENCES quote_item(item_id),
    FOREIGN KEY (source_cost_model_id) REFERENCES cost_model(cost_model_id),
    FOREIGN KEY (source_revision_id) REFERENCES cost_model_revision(revision_id)
);
