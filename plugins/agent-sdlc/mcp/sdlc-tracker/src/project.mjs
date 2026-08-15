/**
 * GitHub Projects v2 board and custom field management.
 *
 * Issues hold a task's identity and body; the board holds the metadata GitHub
 * Issues has no native home for - estimate, phase and dependencies.
 *
 * @typedef {object} IProjectField
 * @property {string} id
 * @property {string} name
 * @property {string} dataType
 * @property {{ id: string, name: string }[]} [options]
 *
 * @typedef {object} IProjectRef
 * @property {string} id
 * @property {number} number
 * @property {string} title
 * @property {Record<string, IProjectField>} fields
 */

import { graphql, GhError } from './gh.mjs';

export const FIELD_ESTIMATE = 'Estimate';
export const FIELD_PHASE = 'Phase';
export const FIELD_DEPENDS_ON = 'Depends On';
export const FIELD_STATUS = 'Status';

export const STATUS_TODO = 'Todo';
export const STATUS_IN_PROGRESS = 'In Progress';
export const STATUS_IN_REVIEW = 'In Review';
export const STATUS_DONE = 'Done';

const MAX_PROJECTS = 20;
const MAX_FIELDS = 50;

const FIELDS_FRAGMENT = `
  fields(first: ${MAX_FIELDS}) {
    nodes {
      ... on ProjectV2FieldCommon { id name dataType }
      ... on ProjectV2SingleSelectField { id name dataType options { id name } }
    }
  }`;

const REPO_PROJECTS_QUERY = `
  query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      projectsV2(first: ${MAX_PROJECTS}) {
        nodes { id number title ${FIELDS_FRAGMENT} }
      }
    }
  }`;

const OWNER_ID_QUERY = `
  query($login: String!) {
    repositoryOwner(login: $login) { id }
  }`;

const CREATE_PROJECT_MUTATION = `
  mutation($ownerId: ID!, $title: String!) {
    createProjectV2(input: { ownerId: $ownerId, title: $title }) {
      projectV2 { id number title ${FIELDS_FRAGMENT} }
    }
  }`;

const LINK_PROJECT_MUTATION = `
  mutation($projectId: ID!, $repositoryId: ID!) {
    linkProjectV2ToRepository(input: { projectId: $projectId, repositoryId: $repositoryId }) {
      repository { id }
    }
  }`;

const CREATE_FIELD_MUTATION = `
  mutation($projectId: ID!, $name: String!, $dataType: ProjectV2CustomFieldType!) {
    createProjectV2Field(input: { projectId: $projectId, name: $name, dataType: $dataType }) {
      projectV2Field {
        ... on ProjectV2FieldCommon { id name dataType }
        ... on ProjectV2SingleSelectField { id name dataType options { id name } }
      }
    }
  }`;

const ADD_ITEM_MUTATION = `
  mutation($projectId: ID!, $contentId: ID!) {
    addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
      item { id }
    }
  }`;

const SET_TEXT_MUTATION = `
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: { text: $value }
    }) { projectV2Item { id } }
  }`;

const SET_NUMBER_MUTATION = `
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: Float!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: { number: $value }
    }) { projectV2Item { id } }
  }`;

const SET_OPTION_MUTATION = `
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
      value: { singleSelectOptionId: $value }
    }) { projectV2Item { id } }
  }`;

const ITEMS_QUERY = `
  query($projectId: ID!, $cursor: String) {
    node(id: $projectId) {
      ... on ProjectV2 {
        items(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            content {
              ... on Issue {
                number title state url
                milestone { title }
                assignees(first: 5) { nodes { login } }
              }
            }
            fieldValues(first: ${MAX_FIELDS}) {
              nodes {
                ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2FieldCommon { name } } }
                ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2FieldCommon { name } } }
                ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
              }
            }
          }
        }
      }
    }
  }`;

/** @param {{ nodes: object[] }} fields @returns {Record<string, IProjectField>} */
const indexFields = (fields) => {
  const byName = {};
  for (const node of fields?.nodes ?? []) {
    if (node?.name) byName[node.name] = node;
  }
  return byName;
};

/**
 * Finds the board by title, creating and linking it when absent.
 *
 * @param {{ owner: string, repo: string, id: string }} repo
 * @param {string} title
 * @param {string} cwd
 * @returns {IProjectRef}
 */
export const findOrCreateProject = (repo, title, cwd) => {
  const existing = graphql(REPO_PROJECTS_QUERY, { owner: repo.owner, repo: repo.repo }, { cwd });
  const match = (existing.repository?.projectsV2?.nodes ?? []).find((node) => node.title === title);
  if (match) {
    return { id: match.id, number: match.number, title: match.title, fields: indexFields(match.fields) };
  }

  const ownerResult = graphql(OWNER_ID_QUERY, { login: repo.owner }, { cwd });
  const ownerId = ownerResult.repositoryOwner?.id;
  if (!ownerId) throw new GhError(`could not resolve owner id for ${repo.owner}`);

  const created = graphql(CREATE_PROJECT_MUTATION, { ownerId, title }, { cwd });
  const project = created.createProjectV2?.projectV2;
  if (!project) throw new GhError('project creation returned no project');

  if (repo.id) {
    graphql(LINK_PROJECT_MUTATION, { projectId: project.id, repositoryId: repo.id }, { cwd });
  }

  return {
    id: project.id,
    number: project.number,
    title: project.title,
    fields: indexFields(project.fields),
  };
};

/**
 * Creates the custom fields the tracker relies on, skipping any that exist.
 *
 * @param {IProjectRef} project
 * @param {string} cwd
 * @returns {{ created: string[], fields: Record<string, IProjectField> }}
 */
export const ensureFields = (project, cwd) => {
  const wanted = [
    { name: FIELD_ESTIMATE, dataType: 'NUMBER' },
    { name: FIELD_PHASE, dataType: 'TEXT' },
    { name: FIELD_DEPENDS_ON, dataType: 'TEXT' },
  ];

  const fields = { ...project.fields };
  const created = [];

  for (const { name, dataType } of wanted) {
    if (fields[name]) continue;
    const result = graphql(CREATE_FIELD_MUTATION, { projectId: project.id, name, dataType }, { cwd });
    const field = result.createProjectV2Field?.projectV2Field;
    if (field) {
      fields[name] = field;
      created.push(name);
    }
  }

  return { created, fields };
};

/**
 * @param {string} projectId
 * @param {string} issueNodeId
 * @param {string} cwd
 * @returns {string} The project item id.
 */
export const addIssueToProject = (projectId, issueNodeId, cwd) => {
  const result = graphql(ADD_ITEM_MUTATION, { projectId, contentId: issueNodeId }, { cwd });
  const itemId = result.addProjectV2ItemById?.item?.id;
  if (!itemId) throw new GhError('could not add issue to project board');
  return itemId;
};

/**
 * @param {object} args
 * @param {string} args.projectId
 * @param {string} args.itemId
 * @param {IProjectField} args.field
 * @param {string | number} args.value
 * @param {string} args.cwd
 */
export const setFieldValue = ({ projectId, itemId, field, value, cwd }) => {
  if (!field) return;

  if (field.dataType === 'NUMBER') {
    graphql(SET_NUMBER_MUTATION, { projectId, itemId, fieldId: field.id, value: Number(value) }, { cwd });
    return;
  }

  if (field.dataType === 'SINGLE_SELECT') {
    const option = (field.options ?? []).find((candidate) => candidate.name === String(value));
    if (!option) {
      throw new GhError(
        `"${value}" is not an option on the ${field.name} field`,
        `available: ${(field.options ?? []).map((o) => o.name).join(', ')}`,
      );
    }
    graphql(SET_OPTION_MUTATION, { projectId, itemId, fieldId: field.id, value: option.id }, { cwd });
    return;
  }

  graphql(SET_TEXT_MUTATION, { projectId, itemId, fieldId: field.id, value: String(value) }, { cwd });
};

/**
 * @param {string} projectId
 * @param {string} cwd
 * @returns {object[]} Board items with their field values flattened.
 */
export const listProjectItems = (projectId, cwd) => {
  const items = [];
  let cursor = null;

  do {
    const variables = cursor ? { projectId, cursor } : { projectId };
    const page = graphql(ITEMS_QUERY, variables, { cwd });
    const connection = page.node?.items;
    if (!connection) break;

    for (const node of connection.nodes ?? []) {
      const values = {};
      for (const value of node.fieldValues?.nodes ?? []) {
        const name = value?.field?.name;
        if (!name) continue;
        values[name] = value.text ?? value.number ?? value.name;
      }
      items.push({ itemId: node.id, content: node.content ?? null, values });
    }

    cursor = connection.pageInfo?.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (cursor);

  return items;
};
