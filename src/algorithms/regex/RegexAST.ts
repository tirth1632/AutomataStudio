export type ASTNodeType =
  | 'LITERAL'
  | 'UNION'
  | 'CONCAT'
  | 'STAR'
  | 'PLUS'
  | 'OPTIONAL'
  | 'EPSILON';

export interface ASTNode {
  type: ASTNodeType;
  value?: string;
  left?: ASTNode;
  right?: ASTNode;
  child?: ASTNode;
}
