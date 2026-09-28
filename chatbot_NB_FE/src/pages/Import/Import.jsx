import React, { useState } from 'react';
import styles from './Import.module.css';
import ImportUploadTab from './ImportUploadTab';
import ImportListTab from './ImportListTab';

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div>
      {/* Tab header (white box with top border & rounded corners) */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabList}>
          <button
            className={`${styles.tabButton} ${activeTab === 'upload' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload Tài liệu tập huấn
          </button>

          <button
            className={`${styles.tabButton} ${activeTab === 'list' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Tài liệu đã tải lên
          </button>
        </div>
        <div className={styles.tabBottomLine} />

        {/* Nội dung */}
        <div className={styles.tabContent}>
          {activeTab === 'upload' ? <ImportUploadTab /> : <ImportListTab />}
        </div>

      </div>  
    </div>
  );
}