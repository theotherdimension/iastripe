jQuery(document).ready(function($) {
    console.log('Stripe Analytics JS initialized');
    
    // Initialize sortable functionality
    $('.stripe-analytics-container').sortable({
        items: '> .card',
        handle: '.card-header',
        placeholder: 'card-placeholder',
        opacity: 0.7,
        stop: function(event, ui) {
            var cardOrder = $(this).sortable('toArray');
            $.post(stripeAnalytics.ajax_url, {
                action: 'save_card_order',
                order: cardOrder,
                nonce: stripeAnalytics.nonce
            });
        }
    });

    // Initialize Refresh Button
    $('#refresh-stats').on('click', function() {
        fetchStats(true);
        fetchSubscriberTable(true);
    });

    // Initialize Test Email Button
$('#test-email-button').on('click', function() {
    const button = $(this);
    const originalText = button.text();
    
    button.prop('disabled', true).text('Sending...');
    
    $.ajax({
        url: stripeAnalytics.ajax_url,
        type: 'POST',
        data: {
            action: 'test_stripe_email',
            nonce: stripeAnalytics.nonce
        },
        success: function(response) {
            if (response.success) {
                alert('Success: ' + response.data);
            } else {
                alert('Error: ' + response.data);
            }
        },
        error: function() {
            alert('Failed to send test email. Please check your server logs.');
        },
        complete: function() {
            button.prop('disabled', false).text(originalText);
        }
    });
});

    // Helper Functions
    function formatLastUpdated(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    function updateLastRefreshed(dateString) {
        if (dateString) {
            $('#last-updated').text('Last refreshed: ' + formatLastUpdated(dateString));
        }
    }

    function setRefreshButtonState(isLoading) {
        const $button = $('#refresh-stats');
        if (isLoading) {
            $button.addClass('loading').prop('disabled', true);
        } else {
            $button.removeClass('loading').prop('disabled', false);
        }
    }

    function formatDate(dateString) {
        try {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-AU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString || 'N/A';
        }
    }

    function formatEmail(email) {
        try {
            if (!email) return 'N/A';
            if (email.length > 30) {
                const parts = email.split('@');
                if (parts.length === 2) {
                    const name = parts[0];
                    const domain = parts[1];
                    if (name.length > 20) {
                        return name.substring(0, 17) + '...@' + domain;
                    }
                }
            }
            return email;
        } catch (error) {
            console.error('Error formatting email:', error);
            return email || 'N/A';
        }
    }

    function showError(message) {
        console.error('Error:', message);
        $('.stat-value').text('Error');
        $('#original-subs-list').html(`
            <tr>
                <td colspan="4" class="text-center">
                    <div class="error-message">
                        Error: ${message}
                        <br>
                        <small>Please check the browser console for more details</small>
                    </div>
                </td>
            </tr>
        `);
    }

function formatDuration(days) {
    // Debug logs
    console.log('formatDuration input:', days);
    
    // Convert days to a proper number and round it
    days = Math.round(Number(days));
    console.log('Converted days:', days);
    
    // Calculate months and remaining days
    const months = Math.floor(days / 30);
    const remainingDays = Math.round(days % 30);
    console.log('Calculated months:', months, 'remainingDays:', remainingDays);
    
    // Calculate years and remaining months
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    console.log('Calculated years:', years, 'remainingMonths:', remainingMonths);

    // Format based on duration
    let result;
    if (days < 30) {
        // Less than a month
        result = `${days} days`;
    } else if (years === 0) {
        // Less than a year
        if (remainingDays === 0) {
            result = `${months} months`;
        } else {
            result = `${months} months, ${remainingDays} days`;
        }
    } else {
        // More than a year
        if (remainingMonths === 0) {
            result = `${years} year${years > 1 ? 's' : ''}`;
        } else {
            result = `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
        }
    }
    
    console.log('Final formatted result:', result);
    return result;
}
    // Main Functions
    function updateDashboard(data) {
    try {
        // Debug log for duration
        console.log('Raw avg_duration:', data.avg_duration);
        console.log('Type of avg_duration:', typeof data.avg_duration);

        // Basic stats
        $('#active-subs-count').text(data.active_count || '0');
        $('#original-subs-count').text(data.original_active || '0');
        $('#returning-subs-count').text(data.returning_count || '0');
        $('#retention-rate').text((data.retention_rate || '0') + '%');
        $('#new-subs-count').text(data.new_this_week || '0');
        $('#cancelled-this-week').text(data.cancelled_this_week || '0');

        // Duration display
        if (data.avg_duration) {
            const formattedDuration = formatDuration(data.avg_duration);
            console.log('Formatted duration:', formattedDuration);
            $('#avg-duration').text(formattedDuration);
        } else {
            $('#avg-duration').text('No data');
        }

        // Rest of your function...
    } catch (error) {
        console.error('Error updating dashboard:', error);
        showError('Error updating dashboard data');
    }
}



    function updateSubscriberTable(subscribers) {
        try {
            if (!subscribers || Object.keys(subscribers).length === 0) {
                $('#original-subs-list').html('<tr><td colspan="4" class="text-center">No long-term subscribers found</td></tr>');
                return;
            }

            // Update title to show it's top 25
            $('#longterm-subs-card .card-header h2').text('Long-term Subscribers (Top 25 by Value)');

            const rows = Object.values(subscribers)
                .filter(sub => sub && sub.email)
                .map(sub => {
                    return `
                        <tr>
                            <td>${formatEmail(sub.email)}</td>
                            <td>${formatDate(sub.signup_date)}</td>
                            <td>${Math.round(sub.duration)} days</td>
                            <td>$${(sub.total_value || 0).toFixed(2)}</td>
                        </tr>
                    `;
                })
                .join('');

            $('#original-subs-list').html(rows || '<tr><td colspan="4" class="text-center">No subscribers with complete data found</td></tr>');
        } catch (error) {
            console.error('Error updating subscriber table:', error);
            $('#original-subs-list').html('<tr><td colspan="4" class="text-center">Error processing subscriber data</td></tr>');
        }
    }

    function fetchStats(forceRefresh = false) {
        setRefreshButtonState(true);

        if (forceRefresh) {
            $('.stat-value').text('Loading...');
        }

        $.ajax({
            url: stripeAnalytics.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'fetch_subscription_stats',
                nonce: stripeAnalytics.nonce,
                force_refresh: forceRefresh,
                _: Date.now()
            },
            success: function(response) {
                if (!response || !response.success) {
                    const errorMessage = response?.data?.message || 'Server error occurred';
                    showError(errorMessage);
                    return;
                }

                updateDashboard(response.data);
                updateLastRefreshed(response.data.last_updated);
            },
            error: function(xhr, status, error) {
                const errorMessage = xhr.responseJSON?.data?.message || 'Connection error - please try again';
                showError(errorMessage);
            },
            complete: function() {
                setRefreshButtonState(false);
            }
        });
    }

    function fetchSubscriberTable(forceRefresh = false) {
        if (!forceRefresh && $('#original-subs-list tr').length > 1) {
            return; // Don't fetch if we already have data and no refresh requested
        }

        $('#original-subs-list').html('<tr><td colspan="4" class="text-center">Loading subscriber data...</td></tr>');

        $.ajax({
            url: stripeAnalytics.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'fetch_subscriber_table',
                nonce: stripeAnalytics.nonce,
                force_refresh: forceRefresh,
                _: Date.now()
            },
            success: function(response) {
                if (!response.success) {
                    console.error('Error fetching subscriber table:', response.data);
                    $('#original-subs-list').html('<tr><td colspan="4" class="text-center">Error loading subscriber data</td></tr>');
                    return;
                }

                updateSubscriberTable(response.data.subscribers);
            },
            error: function(xhr, status, error) {
                console.error('Table AJAX Error:', {
                    status: status,
                    error: error,
                    response: xhr.responseText
                });

                $('#original-subs-list').html(`
                    <tr>
                        <td colspan="4" class="text-center">
                            Error loading subscriber data. Please refresh to try again.
                        </td>
                    </tr>
                `);
            }
        });
    }

    // Initialize Intersection Observer for lazy loading subscriber table
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                fetchSubscriberTable();
                observer.disconnect(); // Only fetch once
            }
        });
    });

    // Start observing the subscriber table card
    observer.observe(document.getElementById('longterm-subs-card'));
});