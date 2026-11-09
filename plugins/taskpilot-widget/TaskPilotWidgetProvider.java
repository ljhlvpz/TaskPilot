package __PACKAGE__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class TaskPilotWidgetProvider extends AppWidgetProvider {
  @Override
  public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
    for (int widgetId : appWidgetIds) {
      RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.taskpilot_widget);
      views.setOnClickPendingIntent(R.id.widget_quick_add_button, makeIntent(context, widgetId));
      manager.updateAppWidget(widgetId, views);
    }
  }

  private PendingIntent makeIntent(Context context, int widgetId) {
    Intent intent = new Intent(Intent.ACTION_VIEW);
    intent.setData(Uri.parse("timemanagementapp:///quick-add"));
    intent.setClassName(context.getPackageName(), context.getPackageName() + ".MainActivity");
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
    return PendingIntent.getActivity(context, widgetId, intent, flags);
  }
}
