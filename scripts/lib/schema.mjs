// One schema shared by the global datasets, the weekly Facebook-group scrape and the combined CSV.
export const COLUMNS = [
  'source', // "global" or "facebook-group"
  'dataset', // Hugging Face dataset id, or "brightdata:<dataset_id>"
  'post_id',
  'timestamp',
  'text',
  'category',
  'sentiment',
  'language',
  'has_link',
  'likes',
  'comments',
  'shares',
  'is_spam',
  'group_name',
  'group_category', // "sri-lanka" or "epf-etf"
  'group_url',
  'post_url',
  'collected_at',
];

export const PATHS = {
  groupsConfig: 'data/facebook-groups.json',
  globalConfig: 'data/global-datasets.json',
  globalDir: 'public/data/global',
  groupsCsv: 'public/data/sl_facebook_groups.csv',
  combinedCsv: 'public/data/combined_dataset.csv',
  summary: 'public/data/dataset-summary.json',
  status: 'public/data/pipeline-status.json',
};
