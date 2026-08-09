import type { AutomatonGraph, ProjectData } from '../types/automata';

const STORAGE_KEY = 'automata_studio_projects';
const ACTIVE_GRAPH_KEY = 'automata_studio_active_graph';
const MAX_SAVED_PROJECTS = 25;

export function saveProjectToStorage(graph: AutomatonGraph): void {
  try {
    let projects = getAllProjects();
    const existingIdx = projects.findIndex((p) => p.id === graph.id);

    const projectItem: ProjectData = {
      id: graph.id,
      name: graph.name || 'Untitled Automaton',
      updatedAt: new Date().toISOString(),
      graph,
    };

    if (existingIdx >= 0) {
      projects[existingIdx] = projectItem;
    } else {
      projects.unshift(projectItem);
    }

    // Automatically keep maximum 25 saved diagrams, evicting the oldest items beyond 25
    if (projects.length > MAX_SAVED_PROJECTS) {
      projects = projects.slice(0, MAX_SAVED_PROJECTS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    localStorage.setItem(ACTIVE_GRAPH_KEY, JSON.stringify(graph));
  } catch (err) {
    console.error('Failed to save project to LocalStorage:', err);
  }
}

export function getAllProjects(): ProjectData[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deleteProjectFromStorage(id: string): void {
  try {
    const projects = getAllProjects().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Failed to delete project:', err);
  }
}

export function getActiveGraphFromStorage(): AutomatonGraph | null {
  try {
    const data = localStorage.getItem(ACTIVE_GRAPH_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function downloadJsonFile(filename: string, data: object): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function saveDiagramAndDownload(graph: AutomatonGraph): ProjectData {
  saveProjectToStorage(graph);

  const cleanName = (graph.name || 'DFA_Diagram').replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${cleanName}_${timestamp}.json`;

  downloadJsonFile(filename, {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    name: graph.name || 'DFA Diagram',
    type: graph.type || 'DFA',
    alphabet: graph.alphabet || ['0', '1'],
    graph,
  });

  return {
    id: graph.id,
    name: graph.name || 'DFA Diagram',
    updatedAt: new Date().toISOString(),
    graph,
  };
}
