import { authHandlers } from './auth';
import { studentsHandlers } from './students';
import { instructorsHandlers } from './instructors';
import { staffHandlers } from './staff';
import { attendanceHandlers } from './attendance';
import { financesHandlers } from './finances';
import { templatesHandlers } from './templates';
import { calendarHandlers } from './calendar';
import { chatHandlers } from './chat';
import { inventoryHandlers } from './inventory';
import { academiesHandlers } from './academies';
import { recycleBinHandlers } from './recycleBin';

export const handlers = [
  ...authHandlers,
  ...studentsHandlers,
  ...instructorsHandlers,
  ...staffHandlers,
  ...attendanceHandlers,
  ...financesHandlers,
  ...templatesHandlers,
  ...calendarHandlers,
  ...chatHandlers,
  ...inventoryHandlers,
  ...academiesHandlers,
  ...recycleBinHandlers,
];
