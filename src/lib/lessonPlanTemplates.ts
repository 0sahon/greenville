/** Prefill shapes for `TeacherLessonPlansSection` form fields. */

export interface LessonPlanFormFields {
  objectives: string;
  activities: string;
  materials_needed: string;
  differentiation: string;
  assessment: string;
  reflection_notes: string;
}

/** Classic Montessori-style five-part lesson flow (headings + prompts). */
export function montessoriFivePartTemplate(): LessonPlanFormFields {
  return {
    objectives:
      'Learning intention:\n• What concept or skill will children construct today?\n• How does this connect to prior work on the shelf / in the environment?\n',
    activities:
      '1) Introduction / invitation\n• How will you spark interest or reconnect to prior knowledge?\n\n2) Main presentation / key experience\n• What will you name, demonstrate, or isolate of difficulty?\n\n3) Guided practice / exploration\n• What follow-up choices or limited practice will children have?\n\n4) Synthesis / consolidation\n• How will you restate the core idea and check for clarity?\n\n5) Extension / going out (optional)\n• What follow-up on the shelf, at home, or in the community extends this work?\n',
    materials_needed:
      'Prepared environment:\n• Montessori materials and any supplementary concrete aids\n• Workspace layout (floor table / group / individual)\n',
    differentiation:
      'By readiness, interest, and learning profile:\n• Simplifications / extensions for fast finishers or children needing more scaffolding\n• Language and cultural supports\n',
    assessment:
      'Observation-focused:\n• What will mastery look like during work time?\n• Short oral or practical checks (if appropriate)\n',
    reflection_notes:
      'After the lesson:\n• What engaged learners? What surprised you?\n• What will you adjust for the next presentation or follow-up?\n',
  };
}

/** Lightweight outline when you only need section prompts. */
export function simpleLessonSkeletonTemplate(): LessonPlanFormFields {
  return {
    objectives: 'By the end of this lesson, students will be able to:\n• \n• \n',
    activities:
      'Opening (5–10 min):\n\nMain teaching / modelling:\n\nGuided practice:\n\nIndependent / pair work:\n\nClosing / exit ticket:\n',
    materials_needed: '• Textbook / handouts\n• Board / slides\n• Manipulatives or visuals\n',
    differentiation: 'Support:\nChallenge:\n',
    assessment: 'Formative:\nSummative (if any):\n',
    reflection_notes: 'What worked? What to change next time?\n',
  };
}
