// One schema shared by the global datasets, the weekly Facebook-group and X collections, and the combined CSV.
export const COLUMNS = [
  'source', // "global", "facebook-group" or "x"
  'dataset', // Hugging Face dataset id, "brightdata:<dataset_id>" or "x-api:v2"
  'post_id',
  'timestamp',
  'text',
  'category',
  'sentiment',
  'language',
  'has_link',
  'likes',
  'comments', // replies, for X posts
  'shares', // reposts plus quotes, for X posts
  'is_spam',
  'group_name', // Facebook group name, or "@handle" for X posts
  'group_category', // "sri-lanka" or "epfs" for groups; the profile's category for X posts
  'group_url', // Facebook group URL, or the X profile URL
  'post_url',
  'collected_at',
];

export const PATHS = {
  groupsConfig: 'data/facebook-groups.json',
  xConfig: 'data/x-profiles.json',
  globalConfig: 'data/global-datasets.json',
  globalDir: 'public/data/global',
  groupsCsv: 'public/data/sl_facebook_groups.csv',
  xCsv: 'public/data/x_posts.csv',
  combinedCsv: 'public/data/combined_dataset.csv',
  summary: 'public/data/dataset-summary.json',
  status: 'public/data/pipeline-status.json',
  xStatus: 'public/data/x-pipeline-status.json',
};
